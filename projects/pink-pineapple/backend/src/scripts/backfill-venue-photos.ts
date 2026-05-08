/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Backfill venue photos for venues that have empty galleries.
 *
 * - Curated Unsplash stock per venue category + cuisine, aspirational
 *   towards the Bali / dark / atmospheric look we want to ship with.
 * - Each Unsplash URL is uploaded to OUR Cloudinary so we own the URLs
 *   forever; when real photography arrives swap is one URL per venue.
 * - Idempotent: skips any venue that already has photos. Safe to re-run.
 *
 * Also performs related housekeeping:
 *   - Yuki + Masonry de-duplication (DB has duplicate records)
 *   - Test Venue One → isActive=false (test artefact from the partner
 *     test pass that's still in the public list)
 *
 * Run on VPS (where Cloudinary creds are configured):
 *   cd /var/www/troyreed1725-backend
 *   npx ts-node src/scripts/backfill-venue-photos.ts
 *
 * Or with --dry to preview without writing:
 *   npx ts-node src/scripts/backfill-venue-photos.ts --dry
 */

import { v2 as cloudinary } from "cloudinary";
import { PrismaClient, VenueCategory } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DRY = process.argv.includes("--dry");

// ── Curated Unsplash photo sets ─────────────────────────────────────────
// All chosen for Bali / atmospheric / dark / golden-hour aesthetic.
// Each set has 4 images so every venue gets a populated gallery.

const RESTAURANT_DEFAULT = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80",
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1600&q=80",
];

const RESTAURANT_STEAKHOUSE = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=80",
  "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1600&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80",
];

const RESTAURANT_ITALIAN = [
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1600&q=80",
  "https://images.unsplash.com/photo-1574894708920-d21bbd14e6e7?w=1600&q=80",
  "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1600&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
];

const RESTAURANT_JAPANESE = [
  "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&q=80",
  "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1600&q=80",
  "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1600&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80",
];

const RESTAURANT_SEAFOOD = [
  "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=1600&q=80",
  "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1600&q=80",
];

const RESTAURANT_ASIAN_FUSION = [
  "https://images.unsplash.com/photo-1574484184081-afea8a62f9ab?w=1600&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1600&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
];

const RESTAURANT_LATIN = [
  "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=1600&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1600&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
];

const NIGHTLIFE_CLUB = [
  "https://images.unsplash.com/photo-1571266028243-d220c6f8a2cc?w=1600&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80",
  "https://images.unsplash.com/photo-1583244532610-2a234e5e1d8f?w=1600&q=80",
  "https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=1600&q=80",
];

const NIGHTLIFE_SPEAKEASY = [
  "https://images.unsplash.com/photo-1568098558831-a30a32f0a7d8?w=1600&q=80",
  "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80",
];

const WELLNESS_DEFAULT = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1600&q=80",
];

const BEACH_CLUB_DEFAULT = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=80",
  "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1600&q=80",
];

// ── Per-venue mapping ───────────────────────────────────────────────────
// Keyed by case-insensitive venue name (we look up by exact name match
// against the live DB).
const VENUE_PHOTOS: Record<string, string[]> = {
  // RESTAURANTS — cuisine-specific where known
  "Aged & Butcher": RESTAURANT_STEAKHOUSE,
  "Bartolo": RESTAURANT_ITALIAN,
  "Numero Quatro": RESTAURANT_ITALIAN,
  "La Luciola": RESTAURANT_ITALIAN,
  "Riviera": RESTAURANT_ITALIAN,
  "Yuki": RESTAURANT_JAPANESE,
  "Shun Omakase": RESTAURANT_JAPANESE,
  "Fish Market": RESTAURANT_SEAFOOD,
  "Red Gunpowder": RESTAURANT_ASIAN_FUSION,
  "Muda/Suka": RESTAURANT_ASIAN_FUSION,
  "SanTanera": RESTAURANT_LATIN,
  "Alchemy": RESTAURANT_DEFAULT,
  "Luma": RESTAURANT_DEFAULT,
  "Masonry": RESTAURANT_DEFAULT,

  // NIGHTLIFE
  "Iron Fairies": NIGHTLIFE_SPEAKEASY,
  "ShiShi": NIGHTLIFE_CLUB,

  // WELLNESS
  "Power & Revive": WELLNESS_DEFAULT,

  // BEACH CLUB
  "Desa Kitsune": BEACH_CLUB_DEFAULT,
};

const TEST_VENUE_NAME_PREFIXES = ["Test Venue"]; // anything starting with this gets isActive=false

const uploadToCloudinary = async (url: string): Promise<string> => {
  if (DRY) return `[dry-run]${url}`;
  const result = await cloudinary.uploader.upload(url, {
    folder: "pinkpineapple/venues",
    resource_type: "image",
    transformation: [{ width: 1600, quality: "auto:good", crop: "limit" }],
  });
  return result.secure_url;
};

const main = async () => {
  console.log(`\n=== Venue photo backfill ${DRY ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      photos: true,
      heroImage: true,
      category: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${venues.length} venues in DB.\n`);

  // ── Pass 1: backfill photos for empty venues ──
  let backfilled = 0;
  let skipped = 0;
  for (const venue of venues) {
    const hasPhotos = (venue.photos?.length ?? 0) > 0;
    if (hasPhotos) {
      skipped++;
      continue;
    }
    const photoSet = VENUE_PHOTOS[venue.name];
    if (!photoSet) {
      console.log(`  ⚠️  No mapping for "${venue.name}" (${venue.category}) — skipping`);
      continue;
    }

    console.log(`  ↗ Uploading ${photoSet.length} photos for "${venue.name}"…`);
    const uploaded: string[] = [];
    for (const url of photoSet) {
      try {
        const cloudUrl = await uploadToCloudinary(url);
        uploaded.push(cloudUrl);
      } catch (err: any) {
        console.error(`    ✗ Upload failed for ${url}: ${err?.message || err}`);
      }
    }

    if (uploaded.length === 0) {
      console.log(`    ✗ No uploads succeeded for ${venue.name}, skipping update`);
      continue;
    }

    if (!DRY) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: {
          photos: uploaded,
          heroImage: uploaded[0],
        },
      });
    }
    console.log(`    ✓ ${venue.name}: ${uploaded.length} photos applied${DRY ? " (dry)" : ""}`);
    backfilled++;
  }

  // ── Pass 2: report same-name venues for manual review ──
  // Don't auto-delete — multiple records sharing a name often turn out to
  // be legitimate separate locations of the same brand (Yuki Canggu vs
  // Yuki Uluwatu, Masonry vs Masonry-Canggu). We just surface them so an
  // admin can decide whether to merge, rename, or leave alone.
  console.log("\n=== Same-name venues (manual review) ===\n");
  const dupCheck = ["Yuki", "Masonry"];
  for (const name of dupCheck) {
    const matches = await prisma.venue.findMany({
      where: { name },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, area: true, createdAt: true },
    });
    if (matches.length <= 1) {
      console.log(`  · "${name}": ${matches.length} record(s) — no duplicates`);
      continue;
    }
    console.log(`  ⚠️  "${name}": ${matches.length} records share this name`);
    for (const v of matches) {
      console.log(
        `       ${v.id}  slug=${v.slug}  area=${v.area}  created=${v.createdAt.toISOString().slice(0, 10)}`
      );
    }
    console.log(
      `       Decide manually: rename one (e.g. "${name} Uluwatu"), or merge if truly duplicate.\n`
    );
  }

  // ── Pass 3: hide test venues ──
  console.log("\n=== Hide test venues ===\n");
  for (const prefix of TEST_VENUE_NAME_PREFIXES) {
    const tests = await prisma.venue.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true, name: true, isActive: true },
    });
    for (const t of tests) {
      if (t.isActive) {
        console.log(`  · "${t.name}" (${t.id}): isActive true → false`);
        if (!DRY) {
          await prisma.venue.update({ where: { id: t.id }, data: { isActive: false } });
        }
      } else {
        console.log(`  · "${t.name}" (${t.id}): already isActive=false, skipping`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Backfilled: ${backfilled}`);
  console.log(`  Skipped (already had photos): ${skipped}`);
  console.log(`  Mode: ${DRY ? "dry-run (no writes)" : "live"}\n`);

  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
