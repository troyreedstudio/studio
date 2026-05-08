/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round 2 of Troy's smoke-test tweaks (2026-05-08):
 *   1. Aged & Butcher: re-roll photos with skip=6 — previous re-roll
 *      still had industrial exterior. Skip deeper into Google's pool.
 *   2. Add Kong to Canggu restaurants (Google Places search + add
 *      Venue + photos in one shot). ownerId = first ADMIN user.
 *
 * The home.dart curated order changes (Bella + Kong added to
 * RESTAURANT, Gimme Shelter moved to NIGHTLIFE) are made directly in
 * the Flutter source — not handled here.
 */

import { v2 as cloudinary } from "cloudinary";
import { PrismaClient, VenueArea, VenueCategory, UserRole } from "@prisma/client";
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
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.location",
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
  if (!places.length) return null;
  const lower = expectedName.toLowerCase();
  return (
    places.find((p: any) =>
      (p.displayName?.text || "").toLowerCase().includes(lower)
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

const main = async () => {
  console.log("\n=== Round 2 fixups ===\n");

  // ── 1. Aged & Butcher: re-roll deeper in Google's photo pool ──
  console.log("→ Aged & Butcher photo re-roll (skip=6, take=4)");
  const ab = await prisma.venue.findFirst({ where: { name: "Aged & Butcher" } });
  if (!ab) {
    console.log("  ✗ not found");
  } else {
    const place = await searchPlace("Aged Butchered Canggu Bali", "Aged");
    const allPhotos = place?.photos || [];
    console.log(`  Google has ${allPhotos.length} photos available`);
    const slice = allPhotos.slice(6, 10);
    if (slice.length === 0) {
      console.log("  ✗ no photos at slice [6..10), aborting");
    } else {
      const urls: string[] = [];
      for (const p of slice) {
        const u = await uploadPhoto(p.name);
        if (u) urls.push(u);
      }
      if (urls.length) {
        await prisma.venue.update({
          where: { id: ab.id },
          data: { photos: urls, heroImage: urls[0] },
        });
        console.log(`  ✓ applied ${urls.length} photo(s)`);
      } else {
        console.log("  ✗ all uploads failed");
      }
    }
  }

  // ── 2. Add Kong to Canggu restaurants ──
  console.log("\n→ Add Kong (Canggu, RESTAURANT)");
  const existing = await prisma.venue.findFirst({ where: { name: "Kong" } });
  if (existing) {
    console.log(`  · already exists (id=${existing.id}), skipping`);
  } else {
    const place = await searchPlace("Kong restaurant Canggu Bali", "Kong");
    if (!place) {
      console.log("  ✗ Google Places didn't find a Kong in Canggu");
    } else {
      console.log(
        `  ✓ matched "${place.displayName?.text}" — ${place.formattedAddress}`
      );
      // Find an admin user for ownership.
      const adminUser = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      if (!adminUser) {
        console.log("  ✗ no ADMIN user to attach as owner");
      } else {
        const photos = (place.photos || []).slice(0, 4);
        const urls: string[] = [];
        for (const p of photos) {
          const u = await uploadPhoto(p.name);
          if (u) urls.push(u);
        }
        const slug = "kong-canggu";
        await prisma.venue.create({
          data: {
            name: "Kong",
            slug,
            description:
              "Kong — Canggu's lively restaurant scene with Asian-leaning plates and a buzzy weekend crowd.",
            area: VenueArea.CANGGU,
            category: VenueCategory.RESTAURANT,
            tags: ["dinner", "weekend"],
            address: place.formattedAddress || "",
            latitude: place.location?.latitude || null,
            longitude: place.location?.longitude || null,
            photos: urls,
            heroImage: urls[0] || "",
            googleRating: place.rating || 0,
            googleRatingCount: place.userRatingCount || 0,
            isActive: true,
            ownerId: adminUser.id,
          },
        });
        console.log(`  ✓ created Kong (slug=${slug}) with ${urls.length} photos`);
      }
    }
  }

  console.log("\n=== Done ===\n");
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
