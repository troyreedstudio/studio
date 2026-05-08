/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Re-roll photos for three gyms whose first slice still landed on poor
 * shots:
 *   - Ulu Fit: hero is two women (group portrait) — need gym interior
 *   - Body Factory: pink/orange Mexican-themed building still in pool
 *   - Raw Gym: shot looks like a class schedule poster, also matches
 *     the photo on another tile
 *
 * Strategy: pull from a deeper slice of Google Places photos (skip past
 * the most-popular which Google often surfaces as exterior / promo).
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

const KEY = process.env.GOOGLE_PLACES_API_KEY!;
const DIM = 1600;

const search = async (q: string) => {
  const r = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.photos",
      },
      body: JSON.stringify({
        textQuery: q,
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
  if (!r.ok) return [];
  const d: any = await r.json();
  return d.places || [];
};

const upload = async (photoName: string) => {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${DIM}&maxWidthPx=${DIM}&key=${KEY}`;
  try {
    const r = await cloudinary.uploader.upload(url, {
      folder: "pinkpineapple/venues",
      resource_type: "image",
      transformation: [{ width: DIM, quality: "auto:good", crop: "limit" }],
    });
    return r.secure_url;
  } catch {
    return null;
  }
};

const reRoll = async (
  venueName: string,
  searchQuery: string,
  expectedNameSubstr: string,
  skip: number,
  take: number
) => {
  const venue = await prisma.venue.findFirst({ where: { name: venueName } });
  if (!venue) {
    console.log(`✗ ${venueName}: not found`);
    return;
  }
  const places: any[] = await search(searchQuery);
  if (!places.length) {
    console.log(`✗ ${venueName}: no Google results`);
    return;
  }
  const lower = expectedNameSubstr.toLowerCase();
  const place =
    places.find((p) =>
      (p.displayName?.text || "").toLowerCase().includes(lower)
    ) || places[0];
  console.log(
    `${venueName}: matched "${place.displayName?.text}" (total photos: ${(place.photos || []).length}, slicing [${skip}..${skip + take}))`
  );
  const photos = (place.photos || []).slice(skip, skip + take);
  if (!photos.length) {
    console.log(`  ✗ no photos at slice`);
    return;
  }
  const urls: string[] = [];
  for (const p of photos) {
    const u = await upload(p.name);
    if (u) urls.push(u);
  }
  if (!urls.length) {
    console.log(`  ✗ all uploads failed`);
    return;
  }
  await prisma.venue.update({
    where: { id: venue.id },
    data: { photos: urls, heroImage: urls[0] },
  });
  console.log(`  ✓ ${urls.length} photos applied`);
};

const main = async () => {
  console.log("\n=== Gym photo re-roll ===\n");

  await reRoll("Ulu Fit", "Ulu Fit Bali Uluwatu fitness gym", "ulu fit", 4, 4);
  await reRoll(
    "Body Factory",
    "Body Factory Bali Canggu fitness gym",
    "body factory",
    6,
    4
  );
  await reRoll("Raw Gym", "Raw Gym Uluwatu Bali fitness", "raw gym", 4, 4);

  console.log("\n=== Done ===\n");
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
