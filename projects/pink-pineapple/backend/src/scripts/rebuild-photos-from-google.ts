/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Rebuild venue photos using Google Places (New) Text Search.
 *
 * Why: stock Unsplash photos were duplicated across venues and didn't
 * always match cuisine/concept. Google Places returns real photos taken
 * AT that exact venue — guaranteed unique, on-aesthetic, free from the
 * "this is just a generic restaurant photo" feeling.
 *
 * Flow per venue:
 *   1. Search Google Places by `${venue.name} ${venue.area} Bali`
 *   2. Take the top result whose name closely matches our venue.name
 *      (case-insensitive prefix or contains check)
 *   3. Fetch up to 4 photo URLs via the place's photos[].name
 *   4. Stream each Google photo through to Cloudinary via uploader.upload
 *      (Cloudinary fetches the URL server-side)
 *   5. Update Venue.photos + heroImage with the resulting Cloudinary URLs
 *
 * Filters:
 *   --category=RESTAURANT (default — only restaurants)
 *   --category=ALL — every category
 *   --names="Yuki Canggu,Aged & Butcher" — only listed venues (overrides category)
 *   --dry — preview without writing
 *
 * Run on VPS where the GOOGLE_PLACES_API_KEY env is set:
 *   cd /var/www/troyreed1725-backend
 *   npx ts-node src/scripts/rebuild-photos-from-google.ts --dry
 *   npx ts-node src/scripts/rebuild-photos-from-google.ts
 */

import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY missing from env");
  process.exit(1);
}

// Args
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const categoryArg =
  args.find((a) => a.startsWith("--category="))?.split("=")[1] ?? "RESTAURANT";
const namesArg = args.find((a) => a.startsWith("--names="))?.split("=")[1];
const onlyNames = namesArg
  ? namesArg.split(",").map((n) => n.trim()).filter(Boolean)
  : null;

const PHOTOS_PER_VENUE = 4;
const PHOTO_MAX_DIM = 1600;

interface GooglePhoto {
  name: string;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  photos?: GooglePhoto[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const searchPlace = async (
  query: string,
  expectedName: string
): Promise<GooglePlace | null> => {
  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY!,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.photos",
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: {
            circle: {
              center: { latitude: -8.4095, longitude: 115.1889 },
              radius: 50000,
            },
          },
          maxResultCount: 5,
          languageCode: "en",
        }),
      }
    );
    if (!res.ok) {
      console.log(`    ✗ Google search failed: ${res.status}`);
      return null;
    }
    const data: any = await res.json();
    const places: GooglePlace[] = data.places || [];
    if (places.length === 0) return null;

    // Best match: case-insensitive name contains check, then fall back to first.
    const expectedLower = expectedName.toLowerCase();
    const matched = places.find((p) =>
      (p.displayName?.text || "").toLowerCase().includes(expectedLower)
    );
    return matched || places[0];
  } catch (err: any) {
    console.log(`    ✗ Google search error: ${err?.message?.slice(0, 80)}`);
    return null;
  }
};

const uploadGooglePhotoToCloudinary = async (
  photoName: string
): Promise<string | null> => {
  const googleUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${PHOTO_MAX_DIM}&maxWidthPx=${PHOTO_MAX_DIM}&key=${GOOGLE_API_KEY}`;
  try {
    if (DRY) return `[dry]https://res.cloudinary.com/.../${photoName.slice(-12)}`;
    const result = await cloudinary.uploader.upload(googleUrl, {
      folder: "pinkpineapple/venues",
      resource_type: "image",
      transformation: [{ width: PHOTO_MAX_DIM, quality: "auto:good", crop: "limit" }],
    });
    return result.secure_url;
  } catch (err: any) {
    console.log(`    ✗ Cloudinary upload failed: ${err?.message?.slice(0, 100)}`);
    return null;
  }
};

const main = async () => {
  console.log(`\n=== Google Places photo rebuild ${DRY ? "(DRY)" : "(LIVE)"} ===`);
  console.log(`  Category filter: ${categoryArg}`);
  if (onlyNames) console.log(`  Name filter: ${onlyNames.join(", ")}`);
  console.log();

  const where: any = {};
  if (onlyNames) {
    where.name = { in: onlyNames };
  } else if (categoryArg !== "ALL") {
    where.category = categoryArg;
  }

  const venues = await prisma.venue.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      category: true,
      photos: true,
      heroImage: true,
    },
    orderBy: { name: "asc" },
  });

  console.log(`Processing ${venues.length} venue(s)\n`);

  let succeeded = 0;
  let failed = 0;
  let unmatched = 0;

  for (const venue of venues) {
    console.log(`→ ${venue.name} (${venue.area})`);

    const place = await searchPlace(
      `${venue.name} ${venue.area} Bali`,
      venue.name
    );
    if (!place) {
      console.log(`    ✗ no Google Places match`);
      unmatched++;
      continue;
    }
    console.log(
      `    ✓ matched "${place.displayName?.text}" (place id ${place.id.slice(-12)})`
    );
    const photos = place.photos || [];
    if (photos.length === 0) {
      console.log(`    ✗ place has no photos`);
      unmatched++;
      continue;
    }
    const photoNames = photos.slice(0, PHOTOS_PER_VENUE).map((p) => p.name);
    console.log(`    ↗ uploading ${photoNames.length} photo(s) via Cloudinary…`);

    const newUrls: string[] = [];
    for (const pn of photoNames) {
      const url = await uploadGooglePhotoToCloudinary(pn);
      if (url) newUrls.push(url);
    }

    if (newUrls.length === 0) {
      console.log(`    ✗ all uploads failed`);
      failed++;
      continue;
    }

    if (!DRY) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { photos: newUrls, heroImage: newUrls[0] },
      });
    }
    console.log(`    ✓ applied ${newUrls.length} photo(s)`);
    succeeded++;

    // Stay polite to Google's rate limits.
    await sleep(150);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Succeeded:  ${succeeded}`);
  console.log(`  No match:   ${unmatched}`);
  console.log(`  Upload fail: ${failed}`);
  console.log(`  Mode:       ${DRY ? "dry-run" : "live"}\n`);

  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error("Rebuild failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
