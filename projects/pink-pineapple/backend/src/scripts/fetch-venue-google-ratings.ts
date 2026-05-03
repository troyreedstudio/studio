import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Backfill venue Google ratings from Google Places (New).
// Idempotent + safe to re-run after adding venues.
//
// Usage (on server, from /var/www/troyreed1725-backend):
//   npx ts-node src/scripts/fetch-venue-google-ratings.ts

const prisma = new PrismaClient();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DELAY_MS = 250;

interface PlaceResult {
  displayName?: string;
  rating?: number;
  userRatingCount?: number;
}

async function searchPlace(query: string): Promise<PlaceResult | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
      languageCode: "en",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
    }>;
  };
  const place = body.places?.[0];
  if (!place) return null;
  return {
    displayName: place.displayName?.text,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
  };
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: GOOGLE_PLACES_API_KEY not set in environment.");
    process.exit(1);
  }

  console.log("Finding venues without googleRating...");
  // MongoDB stores missing fields as absent — fetch all + filter in JS.
  const allVenues = await prisma.venue.findMany({
    select: { id: true, name: true, area: true, googleRating: true },
    orderBy: { name: "asc" },
  });
  const venues = allVenues.filter((v) => v.googleRating == null);

  console.log(`Found ${venues.length} venues to backfill (out of ${allVenues.length} total)\n`);
  if (venues.length === 0) return;

  let success = 0;
  let noMatch = 0;
  let failed = 0;

  for (const venue of venues) {
    const query = `${venue.name} ${venue.area} Bali`;
    const label = `  ${venue.name.padEnd(28)} (${venue.area})`;
    process.stdout.write(`${label.padEnd(44)} `);

    try {
      const result = await searchPlace(query);

      if (!result || result.rating == null) {
        console.log(`NO RATING on Google${result ? ` (matched "${result.displayName}")` : ""}`);
        noMatch++;
        continue;
      }

      await prisma.venue.update({
        where: { id: venue.id },
        data: {
          googleRating: result.rating,
          googleRatingCount: result.userRatingCount ?? 0,
        },
      });

      console.log(`OK — "${result.displayName}" ★${result.rating.toFixed(1)} (${result.userRatingCount ?? 0} ratings)`);
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL: ${msg.slice(0, 100)}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n==========================================`);
  console.log(`Summary: ${success} updated · ${noMatch} no-rating · ${failed} failed`);
  console.log(`==========================================`);
}

main()
  .catch((err) => {
    console.error("Script crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
