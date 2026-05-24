import "dotenv/config";
import { PrismaClient, UserStatus, UserRole } from "@prisma/client";

// One-off backfill for v1.3.0+15 onboarding overhaul:
//
//   1. Email lowercase normalization — historic accounts created
//      via iOS may have mixed-case emails. New code lowercases on
//      every lookup; this aligns existing rows so they match.
//
//   2. firstName / lastName split — populates the new columns by
//      splitting fullName on the first space. "Chase Reed" → first
//      "Chase", last "Reed". Single-word names go to firstName only.
//
//   3. INACTIVE → ACTIVE for any user whose OTP is cleared. These
//      are testers who registered + verified OTP via the OLD build
//      (which hit /verify-otp instead of /verify-register-otp, so
//      OTP cleared but status never flipped). Excludes CLUB role
//      (their flow uses PENDING until admin approves).
//
//   4. Duplicate-email collision check — if two accounts collapse
//      to the same lowercased email, KEEP the most recently
//      created one (likely the one the user actually intended) and
//      log the older as a candidate for manual review. Does NOT
//      auto-delete — Troy decides on a case-by-case basis.
//
// Usage (on server):
//   npx ts-node src/scripts/backfill-user-names-and-emails.ts --dry-run
//   npx ts-node src/scripts/backfill-user-names-and-emails.ts

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

const splitName = (full: string): { first: string; last: string } => {
  const trimmed = (full || "").trim();
  if (!trimmed) return { first: "", last: "" };
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { first: trimmed, last: "" };
  return {
    first: trimmed.slice(0, idx).trim(),
    last: trimmed.slice(idx + 1).trim(),
  };
};

(async () => {
  console.log(`Mode: ${DRY ? "DRY RUN (no writes)" : "LIVE"}\n`);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      firstName: true,
      lastName: true,
      status: true,
      role: true,
      otp: true,
      createdAt: true,
    },
  });

  console.log(`Inspecting ${users.length} users...\n`);

  // Group by lowercased email to spot duplicates first
  const byLowered = new Map<string, typeof users>();
  for (const u of users) {
    const key = (u.email || "").trim().toLowerCase();
    if (!key) continue;
    if (!byLowered.has(key)) byLowered.set(key, []);
    byLowered.get(key)!.push(u);
  }

  const duplicates = Array.from(byLowered.entries()).filter(
    ([, rows]) => rows.length > 1
  );

  if (duplicates.length > 0) {
    console.log(`⚠ DUPLICATE EMAILS DETECTED (${duplicates.length} clusters):`);
    for (const [email, rows] of duplicates) {
      console.log(`  ${email}:`);
      for (const r of rows) {
        console.log(
          `    - ${r.id}  ${(r.fullName || "").padEnd(20)} created=${r.createdAt
            .toISOString()
            .slice(0, 10)}  status=${r.status}`
        );
      }
    }
    console.log(
      "\n→ NOT auto-merging. Review manually and decide which to keep.\n"
    );
  }

  let emailChanged = 0;
  let nameSplit = 0;
  let statusFixed = 0;
  let skippedCollision = 0;

  for (const u of users) {
    const updates: Record<string, any> = {};

    // Email normalization — only if it differs AND no collision risk.
    const lower = (u.email || "").trim().toLowerCase();
    if (lower && lower !== u.email) {
      const cluster = byLowered.get(lower) || [];
      if (cluster.length > 1) {
        // Skip — would create a unique-constraint violation. Manual review.
        skippedCollision++;
      } else {
        updates.email = lower;
        emailChanged++;
      }
    }

    // First/last name split — only if not already set.
    if ((!u.firstName || !u.lastName) && u.fullName) {
      const { first, last } = splitName(u.fullName);
      if (first && !u.firstName) updates.firstName = first;
      if (last && !u.lastName) updates.lastName = last;
      if (updates.firstName || updates.lastName) nameSplit++;
    }

    // INACTIVE → ACTIVE for OTP-cleared non-CLUB users.
    if (
      u.status === UserStatus.INACTIVE &&
      u.role !== UserRole.CLUB &&
      u.otp === null
    ) {
      updates.status = UserStatus.ACTIVE;
      statusFixed++;
    }

    if (Object.keys(updates).length === 0) continue;

    const summary = Object.entries(updates)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    console.log(`  ${u.id}  ${u.email}  →  ${summary}`);

    if (!DRY) {
      await prisma.user.update({
        where: { id: u.id },
        data: updates,
      });
    }
  }

  console.log(`\n==========================================`);
  console.log(`Summary:`);
  console.log(`  email lowercased:   ${emailChanged}`);
  console.log(`  name split:         ${nameSplit}`);
  console.log(`  status → ACTIVE:    ${statusFixed}`);
  console.log(`  skipped (collision):${skippedCollision}`);
  console.log(`==========================================`);
  if (DRY) console.log(`\n(dry run — no changes written)\n`);
})()
  .catch((e) => {
    console.error("Script crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
