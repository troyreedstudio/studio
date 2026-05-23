import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Backfill venue opening hours from Google Places (New).
// Only touches venues with null/empty `openingHours` — safe to re-run.
// Pass --force to overwrite existing openingHours (use with care).
//
// Usage (on server, from /var/www/troyreed1725-backend):
//   npx ts-node src/scripts/fetch-venue-hours-google.ts
//   npx ts-node src/scripts/fetch-venue-hours-google.ts --force
//
// Reads GOOGLE_PLACES_API_KEY from process.env (already in server .env).
//
// Note: Google often gets nightlife close-times wrong (says "8pm" for a
// venue that goes to 3am). After this runs, spot-check clubs in the
// dashboard and override where needed. Restaurants/cafés/gyms are
// almost always accurate.

const prisma = new PrismaClient();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DELAY_MS = 250;
const FORCE = process.argv.includes("--force");

// Google Places uses 0=Sun..6=Sat for the `day` field in opening
// periods. Our internal schema uses mon..sun keys. This array maps
// Google day → our key (index = Google's day).
const GOOGLE_DAY_TO_KEY = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;
type DayKey = (typeof GOOGLE_DAY_TO_KEY)[number];

interface PlacePeriod {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
}

interface PlaceResult {
  displayName?: string;
  periods: PlacePeriod[];
  weekdayDescriptions: string[];
}

async function searchPlace(query: string): Promise<PlaceResult | null> {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.regularOpeningHours",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
        languageCode: "en",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      regularOpeningHours?: {
        periods?: PlacePeriod[];
        weekdayDescriptions?: string[];
      };
    }>;
  };
  const place = body.places?.[0];
  if (!place) return null;

  return {
    displayName: place.displayName?.text,
    periods: place.regularOpeningHours?.periods ?? [],
    weekdayDescriptions:
      place.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmtTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/// Convert Google's periods array to our { mon: "10:00-22:00", tue: "closed", ... }
/// shape. Handles cross-midnight periods (club open Fri 22:00 → Sat 04:00) by
/// keying the period under the OPEN day, not the close day.
function periodsToOpeningHours(
  periods: PlacePeriod[]
): Record<string, string> {
  const result: Record<string, string> = {
    mon: "closed",
    tue: "closed",
    wed: "closed",
    thu: "closed",
    fri: "closed",
    sat: "closed",
    sun: "closed",
  };

  // Special case: Google returns a single period with no `close` and
  // open.day=0 for 24/7 venues. Mark every day as 00:00-23:59.
  if (periods.length === 1 && !periods[0].close) {
    for (const k of GOOGLE_DAY_TO_KEY) result[k] = "00:00-23:59";
    return result;
  }

  // Per-day accumulators — if a venue has multiple windows in one day
  // (e.g. lunch + dinner with a break), we want the WIDEST window so
  // the app doesn't hide the venue during the break.
  const earliest: Record<string, number> = {};
  const latest: Record<string, number> = {};

  for (const p of periods) {
    const openDay = p.open?.day;
    const openHour = p.open?.hour ?? 0;
    const openMinute = p.open?.minute ?? 0;
    if (typeof openDay !== "number" || openDay < 0 || openDay > 6) continue;

    const closeHour = p.close?.hour ?? 23;
    const closeMinute = p.close?.minute ?? 59;
    const closeDay = p.close?.day ?? openDay;

    const openMinutes = openHour * 60 + openMinute;
    // If close is on a different day, treat close-time as +24h so we
    // store e.g. "22:00-26:00" → but our format is HH:MM so we wrap
    // around. For a Fri 22:00 → Sat 04:00 period, this becomes
    // "fri: 22:00-04:00" which is what the consumer app already expects.
    let closeMinutes = closeHour * 60 + closeMinute;
    if (closeDay !== openDay) {
      // Cross-midnight close — wrap. closeMinutes stays in 0..1439.
      // The fact that close < open in the same key is the cross-midnight
      // signal already handled by the app's display layer.
    }

    const key = GOOGLE_DAY_TO_KEY[openDay];
    if (earliest[key] === undefined || openMinutes < earliest[key]) {
      earliest[key] = openMinutes;
    }
    if (latest[key] === undefined || closeMinutes > latest[key]) {
      latest[key] = closeMinutes;
    }
  }

  for (const key of GOOGLE_DAY_TO_KEY) {
    if (earliest[key] === undefined) continue;
    const eH = Math.floor(earliest[key] / 60);
    const eM = earliest[key] % 60;
    const lH = Math.floor(latest[key] / 60);
    const lM = latest[key] % 60;
    result[key] = `${fmtTime(eH, eM)}-${fmtTime(lH, lM)}`;
  }

  return result;
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: GOOGLE_PLACES_API_KEY not set in environment.");
    process.exit(1);
  }

  console.log(
    `Finding venues to backfill (mode: ${FORCE ? "ALL (force)" : "missing only"})...`
  );

  const allVenues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      category: true,
      openingHours: true,
    },
    orderBy: { name: "asc" },
  });

  const venues = FORCE
    ? allVenues
    : allVenues.filter((v) => {
        if (!v.openingHours) return true;
        // Treat empty object / array as missing too.
        if (typeof v.openingHours === "object") {
          const obj = v.openingHours as Record<string, unknown>;
          return Object.keys(obj).length === 0;
        }
        return false;
      });

  console.log(`Found ${venues.length} venues to backfill\n`);
  if (venues.length === 0) return;

  let success = 0;
  let noHours = 0;
  let noMatch = 0;
  let failed = 0;

  for (const venue of venues) {
    const query = `${venue.name} ${venue.area} Bali`;
    const label = `  ${venue.name.padEnd(32)} (${venue.area})`;
    process.stdout.write(`${label.padEnd(48)} `);

    try {
      const result = await searchPlace(query);

      if (!result) {
        console.log("NO MATCH on Google");
        noMatch++;
        continue;
      }

      if (result.periods.length === 0) {
        console.log(`MATCHED "${result.displayName}" — no hours on Google`);
        noHours++;
        continue;
      }

      const openingHours = periodsToOpeningHours(result.periods);

      await prisma.venue.update({
        where: { id: venue.id },
        data: { openingHours },
      });

      const openDays = Object.entries(openingHours).filter(
        ([, v]) => v !== "closed"
      ).length;
      console.log(
        `OK — "${result.displayName}" (${openDays}/7 days)`
      );
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL: ${msg.slice(0, 100)}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n==========================================`);
  console.log(
    `Summary: ${success} updated · ${noHours} no-hours · ${noMatch} no-match · ${failed} failed`
  );
  console.log(`==========================================`);
  console.log(
    `\nReminder: Google often gets nightlife close-times wrong. Spot-check`
  );
  console.log(`clubs in the dashboard and override where needed.`);
}

main()
  .catch((err) => {
    console.error("Script crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
