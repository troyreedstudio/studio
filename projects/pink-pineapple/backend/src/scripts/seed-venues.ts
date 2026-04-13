import { PrismaClient, VenueArea, VenueCategory } from "@prisma/client";

const prisma = new PrismaClient();

interface VenueData {
  name: string;
  slug: string;
  description: string;
  editorial: string;
  area: VenueArea;
  category: VenueCategory;
  address: string;
  latitude: number;
  longitude: number;
  priceRange: number;
  isFeatured: boolean;
  rating: number;
  openingHours: Record<string, string>;
  weeklySchedule: Record<string, Record<string, string | boolean> | null> | null;
  phone: string;
  website: string;
  instagram: string;
}

// Standard opening hours by venue type
const BEACH_CLUB_HOURS = {
  mon: "10:00-22:00",
  tue: "10:00-22:00",
  wed: "10:00-22:00",
  thu: "10:00-22:00",
  fri: "10:00-00:00",
  sat: "10:00-00:00",
  sun: "10:00-22:00",
};

const RESTAURANT_HOURS = {
  mon: "11:00-23:00",
  tue: "11:00-23:00",
  wed: "11:00-23:00",
  thu: "11:00-23:00",
  fri: "11:00-00:00",
  sat: "11:00-00:00",
  sun: "11:00-23:00",
};

const NIGHTLIFE_HOURS = {
  mon: "17:00-02:00",
  tue: "17:00-02:00",
  wed: "17:00-02:00",
  thu: "17:00-03:00",
  fri: "17:00-04:00",
  sat: "17:00-04:00",
  sun: "17:00-02:00",
};

const BRUNCH_HOURS = {
  mon: "07:00-17:00",
  tue: "07:00-17:00",
  wed: "07:00-17:00",
  thu: "07:00-17:00",
  fri: "07:00-17:00",
  sat: "07:00-17:00",
  sun: "07:00-17:00",
};

const GYM_HOURS = {
  mon: "06:00-22:00",
  tue: "06:00-22:00",
  wed: "06:00-22:00",
  thu: "06:00-22:00",
  fri: "06:00-22:00",
  sat: "06:00-22:00",
  sun: "06:00-22:00",
};

const venues: VenueData[] = [
  // ─────────────────────────────────────────────
  // CANGGU (12 venues)
  // ─────────────────────────────────────────────
  {
    name: "Miss Fish",
    slug: "miss-fish",
    description:
      "Popular seafood restaurant in the heart of Canggu serving fresh catches and Asian-fusion dishes.",
    editorial:
      "Miss Fish is where Canggu's well-heeled crowd comes to eat well. The seafood-forward menu pulls from Japanese, Thai, and Indonesian traditions with a modern twist. Think sashimi platters, grilled whole fish, and cocktails that actually taste like something.",
    area: VenueArea.CANGGU,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Pantai Batu Bolong No.62, Canggu, Bali",
    latitude: -8.6510,
    longitude: 115.1325,
    priceRange: 3,
    isFeatured: false,
    rating: 4.4,
    openingHours: RESTAURANT_HOURS,
    weeklySchedule: {
      fri: { name: "Seafood Friday", description: "Fresh catch specials and cocktail pairings", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sat: { name: "Chef's Table Night", description: "Multi-course tasting menu with sake pairing", isSpecial: true, startTime: "19:00", genre: "Dining" },
    },
    phone: "+62 361 907 1888",
    website: "https://missfishbali.com",
    instagram: "@missfishbali",
  },
  {
    name: "Desa Potato Head",
    slug: "desa-potato-head",
    description:
      "Iconic beach club and creative village built from recycled materials with multiple dining concepts, pools, and a recording studio.",
    editorial:
      "Desa Potato Head is less a beach club, more a cultural compound. The architecture alone — thousands of reclaimed shutters forming a jaw-dropping facade — is worth the visit. Inside you'll find multiple restaurants, a proper cocktail bar, an infinity pool, and a genuine commitment to sustainability that goes beyond marketing.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Petitenget No.51B, Seminyak, Bali",
    latitude: -8.6763,
    longitude: 115.1547,
    priceRange: 4,
    isFeatured: true,
    rating: 4.6,
    openingHours: { ...BEACH_CLUB_HOURS, mon: "11:00-22:00", tue: "11:00-22:00", wed: "11:00-22:00", thu: "11:00-22:00", fri: "11:00-00:00", sat: "11:00-00:00", sun: "11:00-22:00" },
    weeklySchedule: {
      sat: { name: "Sunset Sessions", description: "Curated DJ sets as the sun drops over the ocean", isSpecial: true, startTime: "16:00", genre: "Electronic" },
      sun: { name: "Sunday Brunch Party", description: "Extended brunch with live music and pool access", isSpecial: true, startTime: "11:00", genre: "Mixed" },
    },
    phone: "+62 361 6207979",
    website: "https://potatohead.co",
    instagram: "@potatoheadbali",
  },
  {
    name: "Atlas Beach Club",
    slug: "atlas-beach-club",
    description:
      "Massive beachfront club in Berawa with multiple pools, a grand entrance, and capacity for thousands.",
    editorial:
      "Atlas is Bali's answer to the Vegas dayclub — colossal, loud, and unapologetically over the top. With DJ lineups that pull from the global circuit, multiple pool zones, and a sheer scale that dwarfs everything else on the island, this is where you come when you want an event, not just a drink.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Berawa, Canggu, Bali",
    latitude: -8.6595,
    longitude: 115.1442,
    priceRange: 3,
    isFeatured: true,
    rating: 4.3,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      fri: { name: "Pool Party", description: "Daytime pool party with international DJs", isSpecial: true, startTime: "14:00", genre: "Electronic" },
      sat: { name: "Main Event", description: "International DJ headliners and full production", isSpecial: true, startTime: "15:00", genre: "Electronic" },
      sun: { name: "Sunday Sessions", description: "Chilled beats and pool vibes to close the weekend", isSpecial: true, startTime: "13:00", genre: "House" },
    },
    phone: "+62 811 3820 8888",
    website: "https://atlasbeachclub.com",
    instagram: "@atlasbeachclub",
  },
  {
    name: "Finns Beach Club",
    slug: "finns-beach-club",
    description:
      "Premium beach club on Berawa Beach with an infinity pool, day beds, and regular international DJ events.",
    editorial:
      "Finns is the OG Canggu beach club — the one that proved the rice paddies could become a scene. The infinity pool is still one of the best on the island, the day beds are properly comfortable, and the sunset views remain unbeatable. It's polished without being pretentious.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Berawa, Canggu, Bali",
    latitude: -8.6575,
    longitude: 115.1420,
    priceRange: 3,
    isFeatured: false,
    rating: 4.5,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      fri: { name: "Friday Fiesta", description: "Poolside party with guest DJs and fire dancers", isSpecial: true, startTime: "14:00", genre: "House" },
      sat: { name: "Pool Party", description: "All-day pool party with premium sound", isSpecial: true, startTime: "12:00", genre: "Electronic" },
      sun: { name: "Recovery Sunday", description: "Chilled afternoon sessions with acoustic sets", isSpecial: true, startTime: "13:00", genre: "Chill" },
    },
    phone: "+62 361 8446327",
    website: "https://finnsbeachclub.com",
    instagram: "@finnsbeachclub",
  },
  {
    name: "La Brisa",
    slug: "la-brisa",
    description:
      "Bohemian beach bar constructed from reclaimed fishing boats, sitting right on Echo Beach.",
    editorial:
      "La Brisa feels like a shipwreck someone turned into a dream. The entire structure is built from old fishing boats and driftwood, creating this maze of levels and nooks right on the sand. Come for sunset, stay for the grilled seafood and the kind of atmosphere money usually can't buy.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Batu Mejan, Echo Beach, Canggu, Bali",
    latitude: -8.6510,
    longitude: 115.1275,
    priceRange: 3,
    isFeatured: false,
    rating: 4.5,
    openingHours: { ...BEACH_CLUB_HOURS, mon: "11:00-23:00", tue: "11:00-23:00", wed: "11:00-23:00", thu: "11:00-23:00", fri: "11:00-00:00", sat: "11:00-00:00", sun: "11:00-23:00" },
    weeklySchedule: {
      wed: { name: "Bohemian Night", description: "Live acoustic music and boho vibes on the sand", isSpecial: true, startTime: "18:00", genre: "Acoustic" },
      sat: { name: "Beach Party", description: "DJ sets and dancing under the stars", isSpecial: true, startTime: "16:00", genre: "House" },
      sun: { name: "Sunset Session", description: "Golden hour beats and seafood specials", isSpecial: true, startTime: "16:00", genre: "Chill" },
    },
    phone: "+62 812 3639 0380",
    website: "https://labrisabali.com",
    instagram: "@labrisabali",
  },
  {
    name: "Old Man's",
    slug: "old-mans",
    description:
      "Legendary surf bar on Batu Bolong Beach — ground zero for Canggu's social scene since 2013.",
    editorial:
      "Old Man's is where Canggu started. Before the beach clubs and the boutique hotels, there was this: cold Bintangs, sandy feet, and a crowd that actually surfed. It's gotten bigger and louder over the years, but the DNA hasn't changed. Wednesday and Saturday nights are still the ones.",
    area: VenueArea.CANGGU,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Pantai Batu Bolong, Canggu, Bali",
    latitude: -8.6525,
    longitude: 115.1310,
    priceRange: 1,
    isFeatured: false,
    rating: 4.3,
    openingHours: { ...NIGHTLIFE_HOURS, mon: "11:00-02:00", tue: "11:00-02:00", wed: "11:00-03:00", thu: "11:00-02:00", fri: "11:00-04:00", sat: "11:00-04:00", sun: "11:00-02:00" },
    weeklySchedule: {
      mon: { name: "Monday Madness", description: "Cheap drinks and good vibes to start the week", isSpecial: true, startTime: "20:00", genre: "Mixed" },
      wed: { name: "Trivia Night", description: "Pub quiz with prizes and Bintang specials", isSpecial: true, startTime: "19:00", genre: "Mixed" },
      fri: { name: "Live Music", description: "Local and touring bands on the main stage", isSpecial: true, startTime: "21:00", genre: "Live Music" },
    },
    phone: "+62 821 4644 9378",
    website: "https://oldmansbali.com",
    instagram: "@oldmansbali",
  },
  {
    name: "Gimme Shelter",
    slug: "gimme-shelter",
    description:
      "Rock and roll bar in Canggu with live music, craft cocktails, and a late-night crowd that doesn't take itself too seriously.",
    editorial:
      "Gimme Shelter is the antidote to Canggu's influencer culture. No ring lights, no smoothie bowls — just loud music, strong drinks, and a crowd that came to have a good time. The rock-bar aesthetic is genuine, the live music nights deliver, and the cocktails are surprisingly well-made.",
    area: VenueArea.CANGGU,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Pantai Batu Bolong, Canggu, Bali",
    latitude: -8.6502,
    longitude: 115.1335,
    priceRange: 2,
    isFeatured: false,
    rating: 4.2,
    openingHours: NIGHTLIFE_HOURS,
    weeklySchedule: {
      thu: { name: "Rock Night", description: "Classic rock anthems and drink specials", isSpecial: true, startTime: "21:00", genre: "Rock" },
      fri: { name: "Live Bands", description: "Touring and local bands playing live sets", isSpecial: true, startTime: "21:00", genre: "Live Music" },
      sat: { name: "DJ Night", description: "Late-night DJ sets and party vibes", isSpecial: true, startTime: "22:00", genre: "Mixed" },
    },
    phone: "",
    website: "",
    instagram: "@gimmeshelterbali",
  },
  {
    name: "Hungry Bird",
    slug: "hungry-bird",
    description:
      "Popular coffee roastery and brunch spot in Canggu known for specialty coffee and all-day breakfast.",
    editorial:
      "Hungry Bird takes its coffee seriously — single-origin beans, proper roasting, and baristas who actually know what extraction means. The brunch menu is solid but secondary to the main event: some of the best specialty coffee in Bali. The space is bright, unfussy, and full of laptop workers by 9am.",
    area: VenueArea.CANGGU,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Raya Semat No.86, Canggu, Bali",
    latitude: -8.6490,
    longitude: 115.1380,
    priceRange: 2,
    isFeatured: false,
    rating: 4.5,
    openingHours: BRUNCH_HOURS,
    weeklySchedule: null,
    phone: "+62 819 9933 0073",
    website: "",
    instagram: "@hungrybirdcoffee",
  },
  {
    name: "Crate Cafe",
    slug: "crate-cafe",
    description:
      "Brunch institution in Canggu with a health-forward menu, great coffee, and a perpetual queue.",
    editorial:
      "Crate put Canggu brunch on the map. The acai bowls, the avocado toast, the smoothies — they were doing it before everyone else, and they're still doing it well. Yes, there's a wait. Yes, it's worth it. The portions are generous, the ingredients are fresh, and the people-watching is premium.",
    area: VenueArea.CANGGU,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Canggu Padang Linjong No.46, Canggu, Bali",
    latitude: -8.6472,
    longitude: 115.1350,
    priceRange: 2,
    isFeatured: false,
    rating: 4.4,
    openingHours: BRUNCH_HOURS,
    weeklySchedule: null,
    phone: "+62 851 0080 0580",
    website: "https://cratecafebali.com",
    instagram: "@cratecafe",
  },
  {
    name: "The Lawn",
    slug: "the-lawn",
    description:
      "Beachfront dining and drinks on Batu Bolong Beach with a casual-luxe vibe and sunset DJ sets.",
    editorial:
      "The Lawn occupies prime real estate on Batu Bolong and knows it. The grass-meets-sand setup is effortlessly photogenic, the menu leans Mediterranean with local touches, and the sunset sessions with a resident DJ are the closest Canggu gets to understated cool. Not cheap, but the location earns it.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Batu Bolong, Canggu, Bali",
    latitude: -8.6530,
    longitude: 115.1305,
    priceRange: 3,
    isFeatured: false,
    rating: 4.3,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      thu: { name: "Sunset Drinks", description: "Golden hour cocktails with ocean views", isSpecial: true, startTime: "16:00", genre: "Chill" },
      sat: { name: "Beach BBQ", description: "Live BBQ on the sand with DJ sets", isSpecial: true, startTime: "12:00", genre: "Mixed" },
    },
    phone: "+62 361 9348988",
    website: "https://thelawncanggu.com",
    instagram: "@thelawncanggu",
  },
  {
    name: "Tamora Gallery",
    slug: "tamora-gallery",
    description:
      "Art gallery by day, nightclub by night — Canggu's most interesting after-dark venue.",
    editorial:
      "Tamora blurs the line between culture and nightlife in the best way. The gallery space hosts legitimate exhibitions, but come dark, the bass drops and the room transforms. It's the kind of place where you might discuss contemporary art over a cocktail at 8pm and be dancing on the same floor at midnight.",
    area: VenueArea.CANGGU,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Pantai Batu Bolong, Canggu, Bali",
    latitude: -8.6518,
    longitude: 115.1320,
    priceRange: 2,
    isFeatured: false,
    rating: 4.1,
    openingHours: { ...NIGHTLIFE_HOURS, mon: "16:00-02:00", tue: "16:00-02:00", wed: "16:00-02:00", thu: "16:00-03:00", fri: "16:00-04:00", sat: "16:00-04:00", sun: "16:00-02:00" },
    weeklySchedule: {
      fri: { name: "Art & Beats", description: "Gallery exhibition opening with DJ sets", isSpecial: true, startTime: "20:00", genre: "Electronic" },
      sat: { name: "Gallery Night", description: "Art-meets-nightlife with visual installations and music", isSpecial: true, startTime: "21:00", genre: "Electronic" },
    },
    phone: "",
    website: "",
    instagram: "@tamoragallery",
  },
  {
    name: "Como Beach Club",
    slug: "como-beach-club",
    description:
      "Upscale beach club on Berawa Beach with refined dining, craft cocktails, and a minimalist design aesthetic.",
    editorial:
      "Como brings a quieter, more considered energy to Canggu's beach club scene. The design is clean and modern — think white linens and natural wood rather than neon and inflatables. The cocktail list is curated, the food is genuinely good, and the crowd tends older and calmer than its neighbours.",
    area: VenueArea.CANGGU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Berawa, Canggu, Bali",
    latitude: -8.6560,
    longitude: 115.1435,
    priceRange: 3,
    isFeatured: false,
    rating: 4.4,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      fri: { name: "Sunset Sessions", description: "Refined sunset cocktails with resident DJ", isSpecial: true, startTime: "16:00", genre: "House" },
      sat: { name: "Beach Club Night", description: "Upscale evening party with curated music", isSpecial: true, startTime: "18:00", genre: "Electronic" },
    },
    phone: "",
    website: "",
    instagram: "@comobeachclub",
  },

  // ─────────────────────────────────────────────
  // ULUWATU (10 venues)
  // ─────────────────────────────────────────────
  {
    name: "Savaya",
    slug: "savaya",
    description:
      "Clifftop amphitheatre perched above the Indian Ocean, hosting world-class DJs and an unrivalled setting.",
    editorial:
      "Savaya is, without exaggeration, one of the most spectacular nightlife venues on earth. Carved into Uluwatu's cliffs, the multi-level amphitheatre drops down to the ocean with a stage that hosts names like Black Coffee, Peggy Gou, and Disclosure. The production is international, the setting is otherworldly, and ticket prices reflect both.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Belimbing Sari, Pecatu, Uluwatu, Bali",
    latitude: -8.8175,
    longitude: 115.0965,
    priceRange: 4,
    isFeatured: true,
    rating: 4.7,
    openingHours: { mon: "Closed", tue: "12:00-00:00", wed: "12:00-00:00", thu: "12:00-00:00", fri: "12:00-02:00", sat: "12:00-02:00", sun: "12:00-00:00" },
    weeklySchedule: {
      sat: { name: "Major International DJs", description: "World-class headliners in the clifftop amphitheatre", isSpecial: true, startTime: "16:00", genre: "Electronic" },
      sun: { name: "Sunday Session", description: "The big day -- extended afternoon into evening with top DJs", isSpecial: true, startTime: "14:00", genre: "Electronic" },
    },
    phone: "+62 361 8482150",
    website: "https://savayabali.com",
    instagram: "@savayabali",
  },
  {
    name: "El Kabron",
    slug: "el-kabron",
    description:
      "Spanish-Mediterranean cliff-edge dining with panoramic ocean views and a sophisticated wine list.",
    editorial:
      "El Kabron proves you don't need sand to run a world-class beach venue. Perched on Uluwatu's limestone cliffs, the Spanish-influenced menu — think paella, Iberico ham, and grilled seafood — is matched by one of Bali's best wine lists. The terrace at sunset is worth booking a week ahead for.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Pantai Cemongkak, Pecatu, Uluwatu, Bali",
    latitude: -8.8213,
    longitude: 115.0877,
    priceRange: 4,
    isFeatured: false,
    rating: 4.5,
    openingHours: { ...RESTAURANT_HOURS, mon: "12:00-23:00", tue: "12:00-23:00", wed: "12:00-23:00", thu: "12:00-23:00", fri: "12:00-00:00", sat: "12:00-00:00", sun: "12:00-23:00" },
    weeklySchedule: {
      fri: { name: "Spanish Night", description: "Flamenco, paella, and sangria on the cliffs", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sat: { name: "Seafood Feast", description: "Multi-course seafood dinner with ocean views", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sun: { name: "Sunday Brunch", description: "Extended brunch with free-flow drinks and live music", isSpecial: true, startTime: "11:00", genre: "Mixed" },
    },
    phone: "+62 851 0081 8911",
    website: "https://elkabron.com",
    instagram: "@elkabronbali",
  },
  {
    name: "Sundays Beach Club",
    slug: "sundays-beach-club",
    description:
      "Secluded white sand beach accessible by cliff-side inclinator, offering a private beach club experience.",
    editorial:
      "Getting to Sundays is half the experience — a funicular ride down the cliff face delivers you to a hidden cove with white sand and turquoise water. It feels like arriving at a private island. The food is fresh, the cocktails are cold, and the snorkelling off the beach is surprisingly good. Weekday visits are the move.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pantai Selatan Gau, Ungasan, Uluwatu, Bali",
    latitude: -8.8352,
    longitude: 115.1018,
    priceRange: 3,
    isFeatured: false,
    rating: 4.6,
    openingHours: { mon: "09:00-18:00", tue: "09:00-18:00", wed: "09:00-18:00", thu: "09:00-18:00", fri: "09:00-18:00", sat: "09:00-18:00", sun: "09:00-18:00" },
    weeklySchedule: {
      sat: { name: "Beach Day Party", description: "All-day beach party in the secluded cove", isSpecial: true, startTime: "11:00", genre: "Chill" },
      sun: { name: "Sunday Chill", description: "Relaxed Sunday with acoustic music and snorkelling", isSpecial: true, startTime: "10:00", genre: "Chill" },
    },
    phone: "+62 811 3860 6020",
    website: "https://sundaysbeachclub.com",
    instagram: "@sundaysbeachclubbali",
  },
  {
    name: "Ulu Cliffhouse",
    slug: "ulu-cliffhouse",
    description:
      "Cliff-edge venue with infinity pool, multiple dining areas, and dramatic ocean panoramas.",
    editorial:
      "Ulu Cliffhouse is what happens when someone takes the Uluwatu cliff-edge concept and adds an infinity pool that seems to pour into the Indian Ocean. The multi-level layout gives you options — poolside lounging, elevated dining, or bar-side socialising — all with views that make your phone camera feel inadequate.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Labuan Sait, Pecatu, Uluwatu, Bali",
    latitude: -8.8162,
    longitude: 115.0852,
    priceRange: 3,
    isFeatured: false,
    rating: 4.4,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      fri: { name: "Sunset Session", description: "Cliff-edge sunset drinks with DJ", isSpecial: true, startTime: "16:00", genre: "House" },
      sat: { name: "Cliff Party", description: "Full-production party above the Indian Ocean", isSpecial: true, startTime: "14:00", genre: "Electronic" },
    },
    phone: "+62 811 9421 0090",
    website: "https://ulucliffhouse.com",
    instagram: "@ulucliffhouse",
  },
  {
    name: "Single Fin",
    slug: "single-fin",
    description:
      "Iconic surf bar perched above Uluwatu's famous break, known for Sunday sessions and sunset views.",
    editorial:
      "Single Fin is a rite of passage. The clifftop terrace offers a direct view of one of the world's most famous surf breaks, and the Sunday sessions — live music, cheap drinks, and a crowd that actually surfs — remain Uluwatu's best weekly gathering. It's not fancy, and that's the whole point.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Labuan Sait, Pecatu, Uluwatu, Bali",
    latitude: -8.8148,
    longitude: 115.0845,
    priceRange: 2,
    isFeatured: false,
    rating: 4.5,
    openingHours: { mon: "10:00-23:00", tue: "10:00-23:00", wed: "10:00-23:00", thu: "10:00-23:00", fri: "10:00-01:00", sat: "10:00-01:00", sun: "10:00-01:00" },
    weeklySchedule: {
      mon: { name: "Open Mic", description: "Open mic night for musicians and comedians", isSpecial: true, startTime: "19:00", genre: "Live Music" },
      wed: { name: "Surf Film Night", description: "Classic and new surf films on the big screen", isSpecial: true, startTime: "19:00", genre: "Film" },
      sun: { name: "Sunday Sunset", description: "Legendary Sunday session -- live music, cheap drinks, surfer crowd", isSpecial: true, startTime: "15:00", genre: "Live Music" },
    },
    phone: "+62 811 3941 8088",
    website: "https://singlefinbali.com",
    instagram: "@singlefinbali",
  },
  {
    name: "The Edge",
    slug: "the-edge",
    description:
      "Ultra-luxury cliff-top resort with a glass-bottom infinity pool suspended over the ocean.",
    editorial:
      "The Edge's glass-bottom sky pool is one of those things you need to see to believe — swimming while watching the waves crash on the rocks 150 metres below you. The day pass gives you access to the pool, a villa, and the cliff-edge bar. It's eye-wateringly expensive, but the Instagram-before-Instagram spectacle is unique on the island.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Pura Goa Lempeh, Pecatu, Uluwatu, Bali",
    latitude: -8.8205,
    longitude: 115.0785,
    priceRange: 4,
    isFeatured: false,
    rating: 4.6,
    openingHours: { mon: "10:00-20:00", tue: "10:00-20:00", wed: "10:00-20:00", thu: "10:00-20:00", fri: "10:00-20:00", sat: "10:00-20:00", sun: "10:00-20:00" },
    weeklySchedule: {
      sat: { name: "Pool Party", description: "Glass-bottom pool party with cocktails and ocean views", isSpecial: true, startTime: "12:00", genre: "Chill" },
      sun: { name: "Recovery Brunch", description: "Luxury brunch with spa access and cliff views", isSpecial: true, startTime: "10:00", genre: "Dining" },
    },
    phone: "+62 361 8470700",
    website: "https://theedgebali.com",
    instagram: "@theedgebali",
  },
  {
    name: "Omnia Dayclub",
    slug: "omnia-dayclub",
    description:
      "Ultra-luxury dayclub by the Hakkasan Group, built into the Uluwatu cliffs with world-class DJ residencies.",
    editorial:
      "Omnia brought Las Vegas calibre production to Uluwatu and the result is staggering. The multi-tiered venue cascades down the cliff face, with a main pool area, private cabanas, and a sound system that could fill a stadium. Bottle service runs deep, the DJ roster reads like a festival poster, and the dress code means business.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Belimbing Sari, Pecatu, Uluwatu, Bali",
    latitude: -8.8180,
    longitude: 115.0955,
    priceRange: 4,
    isFeatured: true,
    rating: 4.5,
    openingHours: { mon: "Closed", tue: "Closed", wed: "12:00-22:00", thu: "12:00-22:00", fri: "12:00-00:00", sat: "12:00-00:00", sun: "12:00-22:00" },
    weeklySchedule: {
      fri: { name: "Opening Night", description: "Weekend kickoff with headline DJs and full production", isSpecial: true, startTime: "14:00", genre: "Electronic" },
      sat: { name: "Main Event", description: "Peak night -- international DJ residencies and bottle service", isSpecial: true, startTime: "14:00", genre: "Electronic" },
      sun: { name: "Pool Party", description: "Extended daytime pool party to close the weekend", isSpecial: true, startTime: "12:00", genre: "House" },
    },
    phone: "+62 361 8482150",
    website: "https://omniadayclub.com",
    instagram: "@omniadayclub",
  },
  {
    name: "Karma Beach",
    slug: "karma-beach",
    description:
      "Boutique beach club at the bottom of Karma Kandara resort, offering an intimate cove experience.",
    editorial:
      "Karma Beach is the quieter, more intimate cousin of Uluwatu's mega-clubs. Tucked at the base of the Karma Kandara cliffs, the small cove beach feels genuinely private. The Mediterranean-meets-Balinese food is well-executed, the water is crystal clear, and the vibe is more couples-and-conversation than bottle-service-and-bass.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Villa Kandara, Ungasan, Uluwatu, Bali",
    latitude: -8.8395,
    longitude: 115.1060,
    priceRange: 3,
    isFeatured: false,
    rating: 4.4,
    openingHours: { mon: "10:00-18:00", tue: "10:00-18:00", wed: "10:00-18:00", thu: "10:00-18:00", fri: "10:00-18:00", sat: "10:00-18:00", sun: "10:00-18:00" },
    weeklySchedule: {
      sat: { name: "Beach Party", description: "Intimate cove party with DJ and Mediterranean food", isSpecial: true, startTime: "12:00", genre: "Chill" },
    },
    phone: "+62 361 8482202",
    website: "https://karmagroup.com",
    instagram: "@karmabeachbali",
  },
  {
    name: "Mana Uluwatu",
    slug: "mana-uluwatu",
    description:
      "Farm-to-table clifftop dining with a sustainability-first ethos and stunning Indian Ocean views.",
    editorial:
      "Mana is the kind of restaurant that makes you rethink Bali dining. The farm-to-table menu changes with the seasons and leans heavily on local, organic produce. The clifftop setting is spectacular but understated — natural materials, candlelight, and zero pretension. This is where Uluwatu goes to eat when it wants to eat well.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Labuansait, Pecatu, Uluwatu, Bali",
    latitude: -8.8140,
    longitude: 115.0870,
    priceRange: 3,
    isFeatured: false,
    rating: 4.6,
    openingHours: { ...RESTAURANT_HOURS, mon: "12:00-22:00", tue: "12:00-22:00", wed: "12:00-22:00", thu: "12:00-22:00", fri: "12:00-23:00", sat: "12:00-23:00", sun: "12:00-22:00" },
    weeklySchedule: {
      fri: { name: "Farm Dinner", description: "Multi-course farm-to-table dinner with local produce", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sat: { name: "Chef's Tasting", description: "Seasonal tasting menu with wine pairing", isSpecial: true, startTime: "18:00", genre: "Dining" },
    },
    phone: "+62 815 5881 8788",
    website: "https://manauluwatu.com",
    instagram: "@manauluwatu",
  },
  {
    name: "Rock Bar",
    slug: "rock-bar",
    description:
      "Famous bar built on natural rocks at the base of Ayana Resort's cliffs, accessible by cable car.",
    editorial:
      "Rock Bar is Bali's most photographed sunset venue for good reason. Reached by a dramatic cable car descent down the cliffs of Ayana Resort, the bar is literally built on the rocks with the Indian Ocean crashing beneath your feet. Sunset drinks here are a bucket-list moment. Arrive early — the queue gets long and the tables fill fast.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.NIGHTLIFE,
    address: "AYANA Resort, Jl. Karang Mas Sejahtera, Jimbaran, Bali",
    latitude: -8.7878,
    longitude: 115.1442,
    priceRange: 4,
    isFeatured: false,
    rating: 4.7,
    openingHours: { mon: "16:00-00:00", tue: "16:00-00:00", wed: "16:00-00:00", thu: "16:00-00:00", fri: "16:00-01:00", sat: "16:00-01:00", sun: "16:00-00:00" },
    weeklySchedule: {
      fri: { name: "Live Music", description: "Live bands on the rocks with sunset cocktails", isSpecial: true, startTime: "18:00", genre: "Live Music" },
      sat: { name: "Live Music", description: "Weekend live music sessions above the waves", isSpecial: true, startTime: "18:00", genre: "Live Music" },
    },
    phone: "+62 361 8468468",
    website: "https://ayana.com/bali/rock-bar",
    instagram: "@rockbarbali",
  },

  // ─────────────────────────────────────────────
  // WELLNESS / FITNESS — CANGGU (4 venues)
  // ─────────────────────────────────────────────
  {
    name: "Nirvana Fitness",
    slug: "nirvana-fitness",
    description:
      "Premium gym in Canggu with resistance training, functional fitness, and group classes.",
    editorial:
      "Nirvana is the gym Canggu's serious fitness crowd gravitates to. Modern equipment, full AC, and a programming schedule that covers everything from heavy lifting to HIIT classes. The community is strong — regulars know each other by name — and the space is clean, well-maintained, and mercifully free of influencers filming content between sets.",
    area: VenueArea.CANGGU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Pantai Berawa, Canggu, Bali",
    latitude: -8.6545,
    longitude: 115.1395,
    priceRange: 2,
    isFeatured: false,
    rating: 4.6,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@nirvanafitnessbali",
  },
  {
    name: "Body Factory",
    slug: "body-factory",
    description:
      "Bali's biggest gym with huge floor space, full equipment, a boxing ring, and a pool.",
    editorial:
      "Body Factory is sheer scale. The floor space dwarfs anything else on the island — rows of machines, a dedicated free-weight area that could host a powerlifting meet, a boxing ring, and a pool out back for recovery laps. Popular with expats and serious lifters who need more than a boutique studio can offer. Day passes are reasonable, memberships even more so.",
    area: VenueArea.CANGGU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Raya Canggu, Canggu, Bali",
    latitude: -8.6488,
    longitude: 115.1362,
    priceRange: 2,
    isFeatured: false,
    rating: 4.5,
    openingHours: { ...GYM_HOURS, mon: "06:00-23:00", tue: "06:00-23:00", wed: "06:00-23:00", thu: "06:00-23:00", fri: "06:00-23:00", sat: "06:00-23:00", sun: "06:00-23:00" },
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@bodyfactorybali",
  },
  {
    name: "Obsidian",
    slug: "obsidian",
    description:
      "Boutique fitness studio offering CrossFit, HIIT, yoga, and reformer Pilates in small classes.",
    editorial:
      "Obsidian is the antithesis of the mega-gym — small classes, personal attention, and programming that actually challenges you. The CrossFit and HIIT sessions are properly coached, the reformer Pilates studio is immaculate, and the yoga offering rounds it out for recovery days. Premium pricing, but you're paying for quality instruction and a space that never feels crowded.",
    area: VenueArea.CANGGU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Pantai Batu Bolong, Canggu, Bali",
    latitude: -8.6515,
    longitude: 115.1340,
    priceRange: 3,
    isFeatured: false,
    rating: 4.7,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@obsidianbali",
  },
  {
    name: "Saya Club",
    slug: "saya-club",
    description:
      "Members club with gym, pool, and co-working space — designed for digital nomads who want to work and train.",
    editorial:
      "Saya bridges the gap between workspace and wellness in a way that actually works. The gym is well-equipped (not an afterthought), the pool is proper, and the co-working space has fast WiFi and decent coffee. The membership model keeps it curated — you won't be fighting for a squat rack at 5pm — and the crowd is a mix of entrepreneurs, remote workers, and creatives who take both their deadlines and their deadlifts seriously.",
    area: VenueArea.CANGGU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Subak Sari, Canggu, Bali",
    latitude: -8.6535,
    longitude: 115.1415,
    priceRange: 3,
    isFeatured: false,
    rating: 4.4,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@sayaclubbali",
  },

  // ─────────────────────────────────────────────
  // WELLNESS / FITNESS — ULUWATU (5 venues)
  // ─────────────────────────────────────────────
  {
    name: "Bamboo Fitness",
    slug: "bamboo-fitness",
    description:
      "Open-air bamboo gym on the Uluwatu cliffs with ocean views, functional fitness, and free weights.",
    editorial:
      "Bamboo Fitness is what happens when someone decides a gym should have a view. The open-air bamboo structure sits on Uluwatu's cliffs, and you'll be doing deadlifts while watching the Indian Ocean. The equipment leans functional — free weights, pull-up rigs, kettlebells — and the vibe is raw and unpretentious. No AC, no mirrors, just you and the iron and the sea breeze.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Labuan Sait, Pecatu, Uluwatu, Bali",
    latitude: -8.8155,
    longitude: 115.0860,
    priceRange: 1,
    isFeatured: false,
    rating: 4.5,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@bamboofitnessbali",
  },
  {
    name: "Uluwatu Collective",
    slug: "uluwatu-collective",
    description:
      "Community gym and wellness space with yoga, meditation, a gym floor, and a juice bar.",
    editorial:
      "The Collective is Uluwatu's answer to the all-in-one wellness space. Yoga in the morning, weights at lunch, meditation in the evening, and a juice bar that ties it all together. The community feel is genuine — regulars stick around after sessions, and the events calendar (full-moon yoga, sound healing, nutrition workshops) keeps things interesting beyond the gym floor.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Labuansait, Pecatu, Uluwatu, Bali",
    latitude: -8.8142,
    longitude: 115.0875,
    priceRange: 2,
    isFeatured: false,
    rating: 4.3,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@uluwatucollective",
  },
  {
    name: "Muscle Beach Club",
    slug: "muscle-beach-club",
    description:
      "Dual gym and beach club — train in the morning, beach party in the afternoon. A unique Uluwatu concept.",
    editorial:
      "Muscle Beach Club is a concept that shouldn't work but absolutely does. The gym side is legit — proper equipment, good programming, trainers who know what they're doing. Then you walk through to the beach club side for a post-workout smoothie by the pool, and by afternoon the DJs are playing and the whole thing transitions into a party. It's the Uluwatu lifestyle in one venue.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Pantai Selatan Gau, Ungasan, Uluwatu, Bali",
    latitude: -8.8190,
    longitude: 115.0950,
    priceRange: 2,
    isFeatured: true,
    rating: 4.4,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@musclebeachclubbali",
  },
  {
    name: "Ulu Fit",
    slug: "ulu-fit",
    description:
      "Compact but well-equipped gym with AC, modern machines, and affordable day passes.",
    editorial:
      "Ulu Fit is the no-nonsense gym Uluwatu needed. Compact but thoughtfully laid out — modern machines, a decent free-weight section, full air conditioning (a luxury in Bali gyms), and day passes priced low enough that you don't need to commit to a membership. It won't blow your mind, but it'll give you everything you need for a solid session without the markup.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Belimbing Sari, Pecatu, Uluwatu, Bali",
    latitude: -8.8170,
    longitude: 115.0940,
    priceRange: 1,
    isFeatured: false,
    rating: 4.2,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@ulufitbali",
  },
  {
    name: "Raw Gym",
    slug: "raw-gym",
    description:
      "Hardcore training gym with heavy free weights, strongman equipment, and a no-frills attitude.",
    editorial:
      "Raw Gym does exactly what the name suggests. This is where you come when you want to lift heavy and don't care about the aesthetics. Strongman equipment, heavy dumbbells that go well past what boutique gyms stock, squat racks that have seen some serious weight, and a clientele that's there to work. No smoothie bar, no playlist curation — just iron and effort.",
    area: VenueArea.ULUWATU,
    category: VenueCategory.WELLNESS,
    address: "Jl. Raya Uluwatu, Pecatu, Uluwatu, Bali",
    latitude: -8.8195,
    longitude: 115.0930,
    priceRange: 1,
    isFeatured: false,
    rating: 4.3,
    openingHours: GYM_HOURS,
    weeklySchedule: null,
    phone: "",
    website: "",
    instagram: "@rawgymbali",
  },

  // ─────────────────────────────────────────────
  // SEMINYAK (10 venues)
  // ─────────────────────────────────────────────
  {
    name: "Ku De Ta",
    slug: "ku-de-ta",
    description:
      "Legendary sunset institution on Seminyak Beach — one of Bali's original premium dining and lounge venues.",
    editorial:
      "Ku De Ta has been the standard-bearer for Bali's upscale dining-and-drinks scene for over two decades. The beachfront position is unbeatable, the kitchen is genuinely excellent (not just 'good for a beach club'), and the sunset ritual — cocktail in hand, DJ warming up, sky turning amber — remains one of the island's finest daily rituals.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Kayu Aya No.9, Seminyak, Bali",
    latitude: -8.6861,
    longitude: 115.1548,
    priceRange: 4,
    isFeatured: true,
    rating: 4.5,
    openingHours: { mon: "08:00-01:00", tue: "08:00-01:00", wed: "08:00-01:00", thu: "08:00-01:00", fri: "08:00-02:00", sat: "08:00-02:00", sun: "08:00-01:00" },
    weeklySchedule: {
      fri: { name: "Sunset Session", description: "Iconic sunset cocktails with resident DJ on the beach", isSpecial: true, startTime: "16:00", genre: "House" },
      sat: { name: "Beach Club Night", description: "Premium evening party with international DJs", isSpecial: true, startTime: "18:00", genre: "Electronic" },
      sun: { name: "Sunday Brunch", description: "Legendary bottomless brunch with ocean views", isSpecial: true, startTime: "11:00", genre: "Mixed" },
    },
    phone: "+62 361 736969",
    website: "https://kudeta.com",
    instagram: "@kudetabali",
  },
  {
    name: "Potato Head",
    slug: "potato-head-seminyak",
    description:
      "Design-forward beach club on Seminyak Beach with an iconic recycled-shutter facade, pool, and multiple F&B concepts.",
    editorial:
      "Potato Head Seminyak is the original location that started the Desa Potato Head empire. The iconic facade made from thousands of reclaimed wooden shutters is architectural eye candy, the pool is massive, and the food and drink offering spans everything from casual poolside bites to serious cocktails. A Seminyak landmark.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Petitenget No.51B, Seminyak, Bali",
    latitude: -8.6763,
    longitude: 115.1547,
    priceRange: 3,
    isFeatured: false,
    rating: 4.5,
    openingHours: BEACH_CLUB_HOURS,
    weeklySchedule: {
      sat: { name: "Sunset Sessions", description: "DJ sets by the pool as the sun goes down", isSpecial: true, startTime: "16:00", genre: "Electronic" },
      sun: { name: "Sunday Brunch & Pool", description: "Extended brunch with pool access and live music", isSpecial: true, startTime: "11:00", genre: "Mixed" },
    },
    phone: "+62 361 6207979",
    website: "https://potatohead.co",
    instagram: "@potatoheadbali",
  },
  {
    name: "La Favela",
    slug: "la-favela",
    description:
      "Jungle-themed nightclub in Seminyak with eclectic decor, multiple rooms, and a reputation as Bali's wildest night out.",
    editorial:
      "La Favela is organised chaos in the best possible way. The multi-room venue is stuffed with antiques, overgrown plants, and the kind of maximalist decor that shouldn't work but absolutely does. By midnight, the dance floors are packed, the energy is electric, and any plans you had for tomorrow become negotiable. Dress smart — they enforce it.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Kayu Aya No.177X, Seminyak, Bali",
    latitude: -8.6847,
    longitude: 115.1583,
    priceRange: 3,
    isFeatured: true,
    rating: 4.3,
    openingHours: { mon: "18:00-03:00", tue: "18:00-03:00", wed: "18:00-03:00", thu: "18:00-04:00", fri: "18:00-04:00", sat: "18:00-04:00", sun: "18:00-03:00" },
    weeklySchedule: {
      wed: { name: "Ladies Night", description: "Free drinks for ladies 9-11pm -- Seminyak's best midweek party", isSpecial: true, startTime: "21:00", genre: "Mixed" },
      fri: { name: "Jungle Party", description: "Multi-room madness in the jungle-themed venue", isSpecial: true, startTime: "22:00", genre: "Electronic" },
      sat: { name: "Main Night", description: "The biggest party in Seminyak -- packed rooms and top DJs", isSpecial: true, startTime: "22:00", genre: "Electronic" },
    },
    phone: "+62 361 738108",
    website: "https://lafavela.com",
    instagram: "@lafavelabali",
  },
  {
    name: "Mrs Sippy",
    slug: "mrs-sippy",
    description:
      "Pool club in Seminyak with a famous diving board, turquoise pool, and day-party energy.",
    editorial:
      "Mrs Sippy nailed the pool-party formula. The oversized pool, the 5-metre diving board, the Grecian-white aesthetic — it all comes together into the kind of day out that makes your friends back home jealous. Weekend DJ sessions are the main event, but weekday visits are smarter: same pool, half the crowd.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.BEACH_CLUB,
    address: "Jl. Taman Ganesha, Gang Gagak 8B, Seminyak, Bali",
    latitude: -8.6892,
    longitude: 115.1672,
    priceRange: 3,
    isFeatured: false,
    rating: 4.3,
    openingHours: { mon: "10:00-21:00", tue: "10:00-21:00", wed: "10:00-21:00", thu: "10:00-21:00", fri: "10:00-22:00", sat: "10:00-22:00", sun: "10:00-21:00" },
    weeklySchedule: {
      sat: { name: "Pool Party", description: "All-day pool party with DJs, diving board, and cocktails", isSpecial: true, startTime: "12:00", genre: "House" },
      sun: { name: "Sunday Splash", description: "Chilled Sunday pool session with brunch menu", isSpecial: true, startTime: "11:00", genre: "Chill" },
    },
    phone: "+62 361 737804",
    website: "https://mrssippybali.com",
    instagram: "@mrssippybali",
  },
  {
    name: "Motel Mexicola",
    slug: "motel-mexicola",
    description:
      "Mexican-themed party bar in Seminyak with loud music, strong margaritas, and a carnival atmosphere.",
    editorial:
      "Motel Mexicola is Seminyak at its most unapologetically fun. The kitsch Mexican decor — think neon madonnas, vintage wrestling posters, and enough colour to overwhelm a Pantone chart — sets the tone for a venue that refuses to be serious. The tacos are decent, the margaritas are dangerous, and the vibe is pure, unbridled party.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.NIGHTLIFE,
    address: "Jl. Kayu Jati No.9X, Seminyak, Bali",
    latitude: -8.6865,
    longitude: 115.1607,
    priceRange: 2,
    isFeatured: false,
    rating: 4.4,
    openingHours: { mon: "11:00-01:00", tue: "11:00-01:00", wed: "11:00-01:00", thu: "11:00-01:00", fri: "11:00-02:00", sat: "11:00-02:00", sun: "11:00-01:00" },
    weeklySchedule: {
      tue: { name: "Taco Tuesday", description: "Half-price tacos, frozen margaritas, and Latin beats", isSpecial: true, startTime: "17:00", genre: "Latin" },
      thu: { name: "Mezcal Night", description: "Mezcal cocktail specials with Mexican street food", isSpecial: true, startTime: "18:00", genre: "Mixed" },
      sat: { name: "Fiesta", description: "Full-blown Mexican party with DJs and tequila", isSpecial: true, startTime: "21:00", genre: "Latin" },
    },
    phone: "+62 361 736688",
    website: "https://motelmexicola.com",
    instagram: "@motelmexicola",
  },
  {
    name: "Sarong",
    slug: "sarong",
    description:
      "Fine dining Asian fusion restaurant led by acclaimed chef Will Meyrick, set in a lush tropical garden.",
    editorial:
      "Sarong is Bali fine dining at its finest — Will Meyrick's menu travels across Asia with the confidence of someone who's actually eaten in every country he's cooking from. The butter crab curry is legendary, the cocktails are impeccable, and the tropical garden setting makes the whole experience feel like a private dinner party at a very well-connected friend's house.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Petitenget No.19X, Seminyak, Bali",
    latitude: -8.6785,
    longitude: 115.1580,
    priceRange: 4,
    isFeatured: false,
    rating: 4.7,
    openingHours: { mon: "18:00-23:00", tue: "18:00-23:00", wed: "18:00-23:00", thu: "18:00-23:00", fri: "18:00-00:00", sat: "18:00-00:00", sun: "18:00-23:00" },
    weeklySchedule: {
      fri: { name: "Asian Fusion Night", description: "Chef's special multi-course Asian tasting menu", isSpecial: true, startTime: "19:00", genre: "Dining" },
      sat: { name: "Chef's Table", description: "Intimate chef's table experience with wine pairing", isSpecial: true, startTime: "19:00", genre: "Dining" },
    },
    phone: "+62 361 4737809",
    website: "https://sarongbali.com",
    instagram: "@sarongbali",
  },
  {
    name: "Mama San",
    slug: "mama-san",
    description:
      "Upscale Asian street food concept in a converted warehouse, also by chef Will Meyrick.",
    editorial:
      "Mama San takes the hawker-stall hits of Southeast Asia and serves them in a buzzy, industrial-chic warehouse. The Peking duck pancakes, the satays, the Malay laksa — it all works, and it works because Meyrick respects the originals. Upstairs is a cocktail bar worth lingering in, and the lunch set menu is one of Seminyak's best-kept secrets.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Raya Kerobokan No.135, Seminyak, Bali",
    latitude: -8.6825,
    longitude: 115.1610,
    priceRange: 3,
    isFeatured: false,
    rating: 4.5,
    openingHours: { ...RESTAURANT_HOURS, mon: "12:00-23:00", tue: "12:00-23:00", wed: "12:00-23:00", thu: "12:00-23:00", fri: "12:00-00:00", sat: "12:00-00:00", sun: "12:00-23:00" },
    weeklySchedule: {
      thu: { name: "Cocktail Evening", description: "Craft cocktail masterclass with bar snacks", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sat: { name: "Street Food Night", description: "Southeast Asian street food tasting menu", isSpecial: true, startTime: "18:00", genre: "Dining" },
    },
    phone: "+62 361 730436",
    website: "https://mamasanbali.com",
    instagram: "@mamasanbali",
  },
  {
    name: "Barbacoa",
    slug: "barbacoa",
    description:
      "Premium steakhouse and grill in Seminyak specialising in fire-cooked meats and an extensive wine list.",
    editorial:
      "Barbacoa is for the nights when you want steak, done properly, in a setting that feels special. The open-fire kitchen delivers beautifully charred cuts, the wine list is deep enough to get lost in, and the dark, moody interior hits the right note between celebration and intimacy. Not a Tuesday-night dinner — more of a Saturday-worth-it splurge.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Petitenget No.14, Seminyak, Bali",
    latitude: -8.6790,
    longitude: 115.1575,
    priceRange: 4,
    isFeatured: false,
    rating: 4.5,
    openingHours: { mon: "17:00-23:00", tue: "17:00-23:00", wed: "17:00-23:00", thu: "17:00-23:00", fri: "17:00-00:00", sat: "17:00-00:00", sun: "17:00-23:00" },
    weeklySchedule: {
      fri: { name: "Steak Night", description: "Premium cuts, open-fire grill, and red wine specials", isSpecial: true, startTime: "18:00", genre: "Dining" },
      sat: { name: "BBQ & Beats", description: "Live fire BBQ with DJ sets in the courtyard", isSpecial: true, startTime: "18:00", genre: "Mixed" },
    },
    phone: "+62 361 9347888",
    website: "https://barbacoa-bali.com",
    instagram: "@barbacoabali",
  },
  {
    name: "Woo Bar",
    slug: "woo-bar",
    description:
      "Luxury hotel bar at the W Bali with poolside cocktails, sunset DJ sessions, and a fashionable crowd.",
    editorial:
      "Woo Bar comes with all the polish you'd expect from the W brand — sleek design, a cocktail list as long as your arm, and a crowd that dressed up to be seen. The poolside position catches the sunset beautifully, the DJs are well-curated, and the whole thing feels like an international hotel bar that happens to be in one of the best locations on the island.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.NIGHTLIFE,
    address: "W Bali, Jl. Petitenget, Seminyak, Bali",
    latitude: -8.6780,
    longitude: 115.1555,
    priceRange: 4,
    isFeatured: false,
    rating: 4.4,
    openingHours: { mon: "10:00-01:00", tue: "10:00-01:00", wed: "10:00-01:00", thu: "10:00-01:00", fri: "10:00-02:00", sat: "10:00-02:00", sun: "10:00-01:00" },
    weeklySchedule: {
      thu: { name: "Cocktail Night", description: "Craft cocktail specials with the W's mixologists", isSpecial: true, startTime: "18:00", genre: "Mixed" },
      fri: { name: "DJ Night", description: "International and resident DJs by the pool", isSpecial: true, startTime: "20:00", genre: "House" },
      sat: { name: "W Night", description: "The W's signature Saturday party -- dressed up and turned up", isSpecial: true, startTime: "21:00", genre: "Electronic" },
    },
    phone: "+62 361 3000106",
    website: "https://marriott.com/wbali",
    instagram: "@wbaliseminyak",
  },
  {
    name: "Da Maria",
    slug: "da-maria",
    description:
      "Italian dining with a party edge — wood-fired pizza, handmade pasta, and legendary Hip Hop Wednesdays.",
    editorial:
      "Da Maria does two things exceptionally well: Italian food and controlled chaos. The kitchen turns out proper Neapolitan pizza and fresh pasta in a space decorated with Slim Aarons-style prints and pastel colours. But the real draw is Hip Hop Wednesdays — the dinner tables get pushed aside, the bass comes up, and Seminyak's best weekly party kicks off.",
    area: VenueArea.SEMINYAK,
    category: VenueCategory.RESTAURANT,
    address: "Jl. Petitenget No.170, Seminyak, Bali",
    latitude: -8.6795,
    longitude: 115.1560,
    priceRange: 3,
    isFeatured: false,
    rating: 4.6,
    openingHours: { mon: "17:00-00:00", tue: "17:00-00:00", wed: "17:00-02:00", thu: "17:00-00:00", fri: "17:00-01:00", sat: "17:00-01:00", sun: "17:00-00:00" },
    weeklySchedule: {
      mon: { name: "Pizza Night", description: "Wood-fired pizza specials and Italian wines", isSpecial: true, startTime: "18:00", genre: "Dining" },
      wed: { name: "Hip Hop Wednesday", description: "Tables get pushed aside, bass comes up -- Seminyak's best weekly party", isSpecial: true, startTime: "21:00", genre: "Hip Hop" },
      fri: { name: "Italian Night", description: "Handmade pasta, aperitivo hour, and Italian beats", isSpecial: true, startTime: "18:00", genre: "Dining" },
    },
    phone: "+62 361 9348084",
    website: "https://damariabali.com",
    instagram: "@damariabali",
  },
];

async function seedVenues() {
  console.log("=== Pink Pineapple Venue Seed ===\n");

  // 1. Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error(
      "ERROR: No admin user found. Create an admin user first, then re-run this script."
    );
    console.error(
      'Hint: Look for a user with role "ADMIN" in the users collection.'
    );
    process.exit(1);
  }

  console.log(`Using admin user: ${admin.fullName} (${admin.email})\n`);

  // 2. Upsert venues
  let created = 0;
  let updated = 0;

  for (const venue of venues) {
    const result = await prisma.venue.upsert({
      where: { slug: venue.slug },
      update: {
        name: venue.name,
        description: venue.description,
        editorial: venue.editorial,
        area: venue.area,
        category: venue.category,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        priceRange: venue.priceRange,
        isFeatured: venue.isFeatured,
        rating: venue.rating,
        openingHours: venue.openingHours,
        weeklySchedule: venue.weeklySchedule,
        phone: venue.phone,
        website: venue.website,
        instagram: venue.instagram,
        isActive: true,
      },
      create: {
        name: venue.name,
        slug: venue.slug,
        description: venue.description,
        editorial: venue.editorial,
        area: venue.area,
        category: venue.category,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        priceRange: venue.priceRange,
        isFeatured: venue.isFeatured,
        rating: venue.rating,
        openingHours: venue.openingHours,
        weeklySchedule: venue.weeklySchedule,
        phone: venue.phone,
        website: venue.website,
        instagram: venue.instagram,
        photos: [],
        heroImage: "",
        isActive: true,
        ownerId: admin.id,
      },
    });

    // If createdAt and updatedAt are very close, it was just created
    const isNew =
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;

    if (isNew) {
      created++;
      console.log(`  + Created: ${venue.name} (${venue.area} / ${venue.category})`);
    } else {
      updated++;
      console.log(`  ~ Updated: ${venue.name} (${venue.area} / ${venue.category})`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total venues: ${venues.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`\nDone.`);
}

seedVenues()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
