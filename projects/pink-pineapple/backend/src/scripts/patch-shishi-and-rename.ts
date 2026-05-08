/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-off patch script:
 *   1. Top up ShiShi's photo gallery — only got 1/4 in the main backfill
 *      due to Unsplash URL 404s. Try a fresh set of nightlife stock and
 *      append whatever uploads successfully so the gallery feels populated.
 *   2. Rename Yuki + Masonry duplicates with location suffixes so the
 *      consumer app can tell them apart. Slugs stay the same to avoid
 *      breaking deep links.
 *
 * Run on VPS:
 *   cd /var/www/troyreed1725-backend
 *   npx ts-node src/scripts/patch-shishi-and-rename.ts
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

// Fresh set of nightlife / club Unsplash candidates. Trying more than we
// need so a few 404s don't matter — we'll keep whatever uploads OK.
const NIGHTLIFE_CANDIDATES = [
  "https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1600&q=80",
  "https://images.unsplash.com/photo-1545128485-c400ce7b23d0?w=1600&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1600&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
  "https://images.unsplash.com/photo-1545263158-9d5b7e1ff7ad?w=1600&q=80",
  "https://images.unsplash.com/photo-1571266028243-d220c6f8a2cc?w=1600&q=80",
];

const TARGET_NEW_PHOTOS = 3; // Append up to 3 new ones, capping ShiShi at 4 total.

const tryUpload = async (url: string): Promise<string | null> => {
  try {
    const res = await cloudinary.uploader.upload(url, {
      folder: "pinkpineapple/venues",
      resource_type: "image",
      transformation: [{ width: 1600, quality: "auto:good", crop: "limit" }],
    });
    return res.secure_url;
  } catch (err: any) {
    console.log(`    ✗ ${url.slice(0, 80)}: ${err?.message?.slice(0, 60)}`);
    return null;
  }
};

const main = async () => {
  console.log("\n=== ShiShi photo top-up ===\n");
  const shishi = await prisma.venue.findFirst({ where: { name: "ShiShi" } });
  if (!shishi) {
    console.log("  ⚠️  No ShiShi venue found, skipping");
  } else {
    console.log(`  Current photos: ${shishi.photos.length}/4`);
    const collected: string[] = [];
    for (const url of NIGHTLIFE_CANDIDATES) {
      if (collected.length >= TARGET_NEW_PHOTOS) break;
      const cloudUrl = await tryUpload(url);
      if (cloudUrl) {
        collected.push(cloudUrl);
        console.log(`    ✓ uploaded`);
      }
    }
    if (collected.length === 0) {
      console.log("  ✗ All candidates failed — ShiShi unchanged");
    } else {
      const updatedPhotos = [...shishi.photos, ...collected];
      const newHero = shishi.heroImage || updatedPhotos[0];
      await prisma.venue.update({
        where: { id: shishi.id },
        data: { photos: updatedPhotos, heroImage: newHero },
      });
      console.log(
        `  ✓ ShiShi now has ${updatedPhotos.length} photos (added ${collected.length})`
      );
    }
  }

  // ── Rename Yuki + Masonry duplicates with location suffixes ──
  console.log("\n=== Rename same-name venues with location ===\n");

  const renames: Array<{ slug: string; newName: string }> = [
    { slug: "yuki", newName: "Yuki Canggu" },
    { slug: "yuki-uluwatu", newName: "Yuki Uluwatu" },
    { slug: "masonry", newName: "Masonry Uluwatu" },
    { slug: "masonry-canggu", newName: "Masonry Canggu" },
  ];

  for (const r of renames) {
    const v = await prisma.venue.findUnique({
      where: { slug: r.slug },
      select: { id: true, name: true, slug: true, area: true },
    });
    if (!v) {
      console.log(`  ⚠️  No venue found with slug "${r.slug}", skipping`);
      continue;
    }
    if (v.name === r.newName) {
      console.log(`  · "${r.newName}" already named correctly, skipping`);
      continue;
    }
    await prisma.venue.update({
      where: { id: v.id },
      data: { name: r.newName },
    });
    console.log(`  ✓ "${v.name}" → "${r.newName}" (slug=${v.slug}, area=${v.area})`);
  }

  console.log("\n=== Done ===\n");
  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error("Patch failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
