/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Surgical tweaks Troy flagged on 2026-05-08:
 *   1. Desa Kitsune: BEACH_CLUB → NIGHTLIFE (showing in wrong section)
 *   2. Re-roll photos for Atlas Beach Club, The Lawn, La Brisa using a
 *      later slice from Google Places — first 4 photos returned had
 *      the "concrete exterior" / "average" feel; trying photos 4-7
 *      should surface different angles (interior, pool, ocean).
 *
 * Run on VPS:
 *   cd /var/www/troyreed1725-backend
 *   npx ts-node src/scripts/fixup-tweaks-2026-05-08.ts
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

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PHOTO_MAX_DIM = 1600;

const searchPlace = async (query: string, expectedName: string) => {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
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
  if (!res.ok) return null;
  const data: any = await res.json();
  const places = data.places || [];
  if (places.length === 0) return null;
  const expectedLower = expectedName.toLowerCase();
  return (
    places.find((p: any) =>
      (p.displayName?.text || "").toLowerCase().includes(expectedLower)
    ) || places[0]
  );
};

const uploadPhoto = async (photoName: string): Promise<string | null> => {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${PHOTO_MAX_DIM}&maxWidthPx=${PHOTO_MAX_DIM}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await cloudinary.uploader.upload(url, {
      folder: "pinkpineapple/venues",
      resource_type: "image",
      transformation: [{ width: PHOTO_MAX_DIM, quality: "auto:good", crop: "limit" }],
    });
    return res.secure_url;
  } catch {
    return null;
  }
};

const reRollVenuePhotos = async (
  venueName: string,
  searchQuery: string,
  skip: number,
  take: number
) => {
  const venue = await prisma.venue.findFirst({ where: { name: venueName } });
  if (!venue) {
    console.log(`  ✗ no venue "${venueName}"`);
    return;
  }
  const place = await searchPlace(searchQuery, venueName);
  if (!place) {
    console.log(`  ✗ no Google match for "${venueName}"`);
    return;
  }
  const photos = (place.photos || []).slice(skip, skip + take);
  if (photos.length === 0) {
    console.log(`  ✗ "${venueName}" — only ${place.photos?.length ?? 0} photos available, can't take slice [${skip}..${skip + take})`);
    return;
  }
  console.log(`  ↗ ${venueName}: matched "${place.displayName?.text}", uploading ${photos.length} photo(s) from slice [${skip}..${skip + take})…`);
  const newUrls: string[] = [];
  for (const p of photos) {
    const u = await uploadPhoto(p.name);
    if (u) newUrls.push(u);
  }
  if (newUrls.length === 0) {
    console.log(`    ✗ all uploads failed`);
    return;
  }
  await prisma.venue.update({
    where: { id: venue.id },
    data: { photos: newUrls, heroImage: newUrls[0] },
  });
  console.log(`    ✓ applied ${newUrls.length} photos`);
};

const main = async () => {
  console.log("\n=== Fixup tweaks ===\n");

  // 1. Desa Kitsune: move from BEACH_CLUB to NIGHTLIFE
  console.log("→ Desa Kitsune category fix");
  const desa = await prisma.venue.findFirst({ where: { name: "Desa Kitsune" } });
  if (desa) {
    if (desa.category !== VenueCategory.NIGHTLIFE) {
      await prisma.venue.update({
        where: { id: desa.id },
        data: { category: VenueCategory.NIGHTLIFE },
      });
      console.log(`  ✓ Desa Kitsune: ${desa.category} → NIGHTLIFE`);
    } else {
      console.log(`  · already NIGHTLIFE, skipping`);
    }
  } else {
    console.log("  ✗ Desa Kitsune not found");
  }

  console.log("\n→ Re-rolling photos for 3 venues with deeper photo slices\n");

  // 2. Atlas Beach Club: take photos[4..8] hoping for interior shots
  await reRollVenuePhotos(
    "Atlas Beach Club",
    "Atlas Beach Club Bali interior",
    4,
    4
  );

  // 3. The Lawn: pool/ocean shots — try slice [3..7]
  await reRollVenuePhotos(
    "The Lawn",
    "The Lawn Canggu Beach Club pool ocean",
    3,
    4
  );

  // 4. La Brisa: pool/ocean shots — slice [3..7]
  await reRollVenuePhotos(
    "La Brisa",
    "La Brisa Bali Beach Club pool ocean",
    3,
    4
  );

  console.log("\n=== Done ===\n");
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
