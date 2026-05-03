import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Backfill venue latitude/longitude (and address) from Google Places (New).
// Only touches venues with `latitude: null` — safe to re-run after adding new venues.
//
// Usage (on server, from /var/www/troyreed1725-backend):
//   npx ts-node src/scripts/fetch-venue-coords-google.ts
//
// Reads GOOGLE_PLACES_API_KEY from process.env (already in server .env).

const prisma = new PrismaClient();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DELAY_MS = 250;

interface PlaceResult {
  displayName?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

async function searchPlace(query: string): Promise<PlaceResult | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress",
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
      location?: { latitude?: number; longitude?: number };
      formattedAddress?: string;
    }>;
  };
  const place = body.places?.[0];
  if (!place) return null;

  return {
    displayName: place.displayName?.text,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    formattedAddress: place.formattedAddress,
  };
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: GOOGLE_PLACES_API_KEY not set in environment.");
    process.exit(1);
  }

  console.log("Finding venues without latitude...");
  // MongoDB stores missing fields as absent (not null), and Prisma can't filter
  // on field absence. So fetch all venues and filter in JS.
  const allVenues = await prisma.venue.findMany({
    select: { id: true, name: true, slug: true, area: true, address: true, latitude: true },
    orderBy: { name: "asc" },
  });
  const venues = allVenues.filter((v) => v.latitude == null);

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

      if (!result || result.latitude == null || result.longitude == null) {
        console.log(`NO MATCH on Google${result ? ` (matched "${result.displayName}" but no coords)` : ""}`);
        noMatch++;
        continue;
      }

      // Only update address if it was empty (don't overwrite admin edits)
      const updates: { latitude: number; longitude: number; address?: string } = {
        latitude: result.latitude,
        longitude: result.longitude,
      };
      if (!venue.address && result.formattedAddress) {
        updates.address = result.formattedAddress;
      }

      await prisma.venue.update({
        where: { id: venue.id },
        data: updates,
      });

      const addrNote = updates.address ? " + addr" : "";
      console.log(`OK — "${result.displayName}" (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})${addrNote}`);
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL: ${msg.slice(0, 100)}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n==========================================`);
  console.log(`Summary: ${success} updated · ${noMatch} no-match · ${failed} failed`);
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
