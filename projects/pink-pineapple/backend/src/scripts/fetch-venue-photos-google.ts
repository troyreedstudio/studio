import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Backfill venue photos from Google Places (New).
// Only touches venues with empty `heroImage` — safe to re-run.
//
// Usage (on server, from /var/www/troyreed1725-backend):
//   npx ts-node src/scripts/fetch-venue-photos-google.ts
//
// Reads GOOGLE_PLACES_API_KEY from process.env (already in server .env).

const prisma = new PrismaClient();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PHOTO_MAX = 1920;
const GALLERY_MAX_SIZE = 4;
const DELAY_MS = 250; // gentle rate limit between venues

interface PlaceResult {
  displayName?: string;
  photoNames: string[];
}

async function searchPlace(query: string): Promise<PlaceResult | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
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

  const body = (await res.json()) as { places?: Array<{ displayName?: { text?: string }; photos?: Array<{ name?: string }> }> };
  const place = body.places?.[0];
  if (!place) return null;

  const photoNames = (place.photos ?? [])
    .map((p) => p.name)
    .filter((n): n is string => typeof n === "string");

  return {
    displayName: place.displayName?.text,
    photoNames,
  };
}

function photoUrl(photoName: string): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${PHOTO_MAX}&maxWidthPx=${PHOTO_MAX}&key=${API_KEY}`;
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: GOOGLE_PLACES_API_KEY not set in environment.");
    process.exit(1);
  }

  console.log("Finding venues without heroImage...");
  const venues = await prisma.venue.findMany({
    where: { heroImage: "" },
    select: { id: true, name: true, slug: true, area: true, category: true },
    orderBy: { name: "asc" },
  });

  console.log(`Found ${venues.length} venues to backfill\n`);
  if (venues.length === 0) return;

  let success = 0;
  let noPhoto = 0;
  let failed = 0;

  for (const venue of venues) {
    const query = `${venue.name} ${venue.area} Bali`;
    const label = `  ${venue.name.padEnd(32)} (${venue.area})`;
    process.stdout.write(`${label.padEnd(48)} `);

    try {
      const result = await searchPlace(query);

      if (!result) {
        console.log("NO MATCH on Google");
        noPhoto++;
        continue;
      }

      if (result.photoNames.length === 0) {
        console.log(`MATCHED "${result.displayName}" — no photos on Google`);
        noPhoto++;
        continue;
      }

      const hero = photoUrl(result.photoNames[0]);
      const gallery = result.photoNames
        .slice(1, 1 + GALLERY_MAX_SIZE)
        .map(photoUrl);

      await prisma.venue.update({
        where: { id: venue.id },
        data: { heroImage: hero, photos: gallery },
      });

      console.log(`OK — "${result.displayName}" (hero + ${gallery.length} gallery)`);
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL: ${msg.slice(0, 100)}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n==========================================`);
  console.log(`Summary: ${success} updated · ${noPhoto} no-photo · ${failed} failed`);
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
