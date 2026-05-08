/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Targeted re-roll for Fish Market + Body Factory:
 * - "Fish Market Uluwatu Bali" was matching a wholesale fish market;
 *   need to search with "restaurant" in the query so Google ranks the
 *   actual high-end Fish Market restaurant first.
 * - "Body Factory Seminyak Bali" matched a Mexican-themed building;
 *   need "gym" in the query so it locks onto the Seminyak gym.
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

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PHOTO_MAX_DIM = 1600;

const search = async (q: string) => {
  const r = await fetch(
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
  if (!r.ok) return null;
  const d: any = await r.json();
  return d.places || [];
};

const upload = async (photoName: string) => {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${PHOTO_MAX_DIM}&maxWidthPx=${PHOTO_MAX_DIM}&key=${GOOGLE_API_KEY}`;
  try {
    const r = await cloudinary.uploader.upload(url, {
      folder: "pinkpineapple/venues",
      resource_type: "image",
      transformation: [{ width: PHOTO_MAX_DIM, quality: "auto:good", crop: "limit" }],
    });
    return r.secure_url;
  } catch {
    return null;
  }
};

const reRoll = async (
  venueName: string,
  query: string,
  expectMatchContains: string[]
) => {
  const venue = await prisma.venue.findFirst({ where: { name: venueName } });
  if (!venue) {
    console.log(`  ✗ ${venueName}: not found`);
    return;
  }
  const places: any[] = (await search(query)) || [];
  if (places.length === 0) {
    console.log(`  ✗ ${venueName}: no Google results for "${query}"`);
    return;
  }
  console.log(`  ${venueName}: Google returned ${places.length} candidates:`);
  places.forEach((p, i) =>
    console.log(`    [${i}] "${p.displayName?.text}" — ${p.formattedAddress?.slice(0, 80)}`)
  );
  // Pick the first place whose name contains any of the expected substrings.
  const lower = (s: string) => (s || "").toLowerCase();
  const matched = places.find((p) => {
    const t = lower(p.displayName?.text || "");
    return expectMatchContains.some((e) => t.includes(e.toLowerCase()));
  });
  const place = matched || places[0];
  console.log(`  → picked "${place.displayName?.text}"`);
  const photos = (place.photos || []).slice(0, 4);
  if (photos.length === 0) {
    console.log(`  ✗ no photos`);
    return;
  }
  const urls: string[] = [];
  for (const p of photos) {
    const u = await upload(p.name);
    if (u) urls.push(u);
  }
  if (urls.length === 0) {
    console.log(`  ✗ all uploads failed`);
    return;
  }
  await prisma.venue.update({
    where: { id: venue.id },
    data: { photos: urls, heroImage: urls[0] },
  });
  console.log(`  ✓ ${venueName}: ${urls.length} new photos applied\n`);
};

const main = async () => {
  console.log("\n=== Fish Market + Body Factory re-roll ===\n");

  await reRoll(
    "Fish Market",
    "Fish Market restaurant Uluwatu Bali fine dining",
    ["fish market"]
  );

  await reRoll(
    "Body Factory",
    "Body Factory gym Seminyak Bali fitness",
    ["body factory"]
  );

  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
