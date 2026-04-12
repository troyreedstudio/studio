import { PrismaClient, VenueCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Curated Unsplash photo URLs by venue category
// All photos are free for commercial use (Unsplash license)
const PHOTO_URLS: Record<VenueCategory, string[]> = {
  BEACH_CLUB: [
    "https://images.unsplash.com/photo-1540541338287-41700c73c306?w=1920&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1920&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&q=80",
    "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=80",
    "https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=1920&q=80",
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1920&q=80",
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80",
    "https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1920&q=80",
  ],
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=1920&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=1920&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1920&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1920&q=80",
    "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=1920&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1920&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=80",
  ],
  NIGHTLIFE: [
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1920&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1920&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1920&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1920&q=80",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80",
    "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=1920&q=80",
    "https://images.unsplash.com/photo-1575444758702-4a6b9222c016?w=1920&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=80",
    "https://images.unsplash.com/photo-1598899247038-b824cc3ad96c?w=1920&q=80",
    "https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=1920&q=80",
  ],
  WELLNESS: [
    "https://images.unsplash.com/photo-1540555700478-4be289fbec6a?w=1920&q=80",
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920&q=80",
    "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1920&q=80",
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80",
  ],
  EVENTS: [
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80",
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1920&q=80",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1920&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80",
  ],
};

const GALLERY_SIZE = 4;

function pickPhoto(photos: string[], index: number): string {
  return photos[index % photos.length];
}

function pickGallery(photos: string[], startIndex: number): string[] {
  const gallery: string[] = [];
  for (let i = 0; i < GALLERY_SIZE; i++) {
    gallery.push(pickPhoto(photos, startIndex + i));
  }
  return gallery;
}

async function main() {
  console.log("Fetching all venues...");
  const venues = await prisma.venue.findMany({
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });

  console.log(`Found ${venues.length} venues\n`);

  // Track per-category index so each venue in the same category
  // gets a different hero image and gallery rotation
  const categoryIndex: Record<string, number> = {};

  for (const venue of venues) {
    const photos = PHOTO_URLS[venue.category];
    if (!photos || photos.length === 0) {
      console.log(`  SKIP  ${venue.name} — no photos for category ${venue.category}`);
      continue;
    }

    const idx = categoryIndex[venue.category] ?? 0;
    categoryIndex[venue.category] = idx + 1;

    const heroImage = pickPhoto(photos, idx);
    const gallery = pickGallery(photos, idx + 1);

    await prisma.venue.update({
      where: { id: venue.id },
      data: { heroImage, photos: gallery },
    });

    console.log(`  OK    ${venue.name} (${venue.category}) — hero + ${gallery.length} gallery`);
  }

  console.log("\nDone. All venues updated with placeholder photos.");
}

main()
  .catch((err) => {
    console.error("Failed to assign venue photos:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
