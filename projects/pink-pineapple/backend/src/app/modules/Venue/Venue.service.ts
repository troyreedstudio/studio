import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Prisma, VenueArea, VenueCategory } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import {
  IVenueFilterRequest,
  venueSearchableFields,
} from "./Venue.interface";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const createIntoDb = async (data: any) => {
  const slug = generateSlug(data.name);

  // Check slug uniqueness
  const existing = await prisma.venue.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "A venue with a similar name already exists"
    );
  }

  const result = await prisma.venue.create({
    data: {
      ...data,
      slug,
    },
  });

  return result;
};

const getListFromDb = async (
  params: IVenueFilterRequest,
  options: IPaginationOptions,
  userId?: string
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.VenueWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: venueSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => {
        let value = (filterData as any)[key];
        // Handle boolean strings
        if (value === "true") value = true;
        if (value === "false") value = false;

        // For category filtering, also include venues tagged with that category
        if (key === "category" && typeof value === "string") {
          const categoryValue = value as VenueCategory;
          return {
            OR: [
              { category: { equals: categoryValue } },
              { tags: { hasSome: [value.toLowerCase()] } },
            ],
          } as Prisma.VenueWhereInput;
        }

        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const whereConditions: Prisma.VenueWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const venues = await prisma.venue.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      area: true,
      category: true,
      tags: true,
      address: true,
      heroImage: true,
      bookingUrl: true,
      photos: true,
      priceRange: true,
      rating: true,
      isActive: true,
      isFeatured: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.venue.count({ where: whereConditions });

  // Add isFavorite flag if user is logged in
  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.venueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.venueId));
  }

  const enrichedVenues = venues.map((venue) => ({
    ...venue,
    isFavorite: favoriteIds.has(venue.id),
  }));

  const withVibes = await attachRecentVibes(enrichedVenues);

  return {
    meta: { page, limit, total },
    data: withVibes,
  };
};

/// Batches one query across N venue IDs to attach a `recentVibe` aggregate
/// (avg crowd/music/energy from last 4 hours) to each. Used by list endpoints.
const attachRecentVibes = async <T extends { id: string }>(
  venues: T[]
): Promise<(T & { recentVibe: unknown })[]> => {
  if (venues.length === 0) return venues as (T & { recentVibe: unknown })[];
  const ids = venues.map((v) => v.id);
  const cutoff = new Date(Date.now() - VIBE_FRESHNESS_HOURS_FOR_LIST * 60 * 60 * 1000);
  const allVibes = await prisma.venueVibe.findMany({
    where: { venueId: { in: ids }, createdAt: { gte: cutoff } },
    select: { venueId: true, crowd: true, music: true, energy: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const byVenue = new Map<string, typeof allVibes>();
  for (const v of allVibes) {
    if (!byVenue.has(v.venueId)) byVenue.set(v.venueId, []);
    byVenue.get(v.venueId)!.push(v);
  }
  return venues.map((v) => {
    const vs = byVenue.get(v.id) ?? [];
    if (vs.length === 0) return { ...v, recentVibe: null };
    const avg = (key: "crowd" | "music" | "energy") =>
      Math.round(vs.reduce((s, x) => s + x[key], 0) / vs.length);
    return {
      ...v,
      recentVibe: {
        crowd: avg("crowd"),
        music: avg("music"),
        energy: avg("energy"),
        count: vs.length,
        mostRecentAt: vs[0].createdAt,
      },
    };
  });
};

const VIBE_FRESHNESS_HOURS_FOR_LIST = 4;

const getByArea = async (area: string, userId?: string) => {
  const venueArea = area.toUpperCase() as VenueArea;

  const venues = await prisma.venue.findMany({
    where: { area: venueArea, isActive: true },
    orderBy: { isFeatured: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      area: true,
      category: true,
      tags: true,
      address: true,
      heroImage: true,
      bookingUrl: true,
      photos: true,
      priceRange: true,
      rating: true,
      isFeatured: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
  });

  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.venueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.venueId));
  }

  return venues.map((venue) => ({
    ...venue,
    isFavorite: favoriteIds.has(venue.id),
  }));
};

const getByIdFromDb = async (id: string, userId?: string) => {
  const result = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      editorial: true,
      area: true,
      category: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      website: true,
      instagram: true,
      priceRange: true,
      openingHours: true,
      weeklySchedule: true,
      photos: true,
      heroImage: true,
      bookingUrl: true,
      isActive: true,
      isFeatured: true,
      rating: true,
      googleRating: true,
      googleRatingCount: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
      _count: {
        select: {
          events: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  let isFavorite = false;
  if (userId) {
    const favorite = await prisma.venueFavorite.findFirst({
      where: { userId, venueId: id },
      select: { id: true },
    });
    isFavorite = !!favorite;
  }

  const ppData = await getPpAggregateForVenue(id);
  const recentVibe = await getRecentVibeForVenue(id);

  return { ...result, isFavorite, ...ppData, recentVibe };
};

const updateIntoDb = async (id: string, data: any) => {
  const isExists = await prisma.venue.findUnique({ where: { id } });
  if (!isExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  // If name is being updated, regenerate slug
  if (data.name) {
    data.slug = generateSlug(data.name);
    const slugConflict = await prisma.venue.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (slugConflict) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "A venue with a similar name already exists"
      );
    }
  }

  const result = await prisma.venue.update({
    where: { id },
    data,
  });

  return result;
};

const deleteFromDb = async (id: string) => {
  const isExists = await prisma.venue.findUnique({ where: { id } });
  if (!isExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete related favorites first
    await tx.venueFavorite.deleteMany({ where: { venueId: id } });
    const deleted = await tx.venue.delete({ where: { id } });
    return deleted;
  });

  return result;
};

const getFeatured = async (userId?: string) => {
  const venues = await prisma.venue.findMany({
    where: { isFeatured: true, isActive: true },
    orderBy: { rating: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      area: true,
      category: true,
      heroImage: true,
      bookingUrl: true,
      priceRange: true,
      rating: true,
      isFeatured: true,
      createdAt: true,
    },
  });

  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.venueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.venueId));
  }

  return venues.map((venue) => ({
    ...venue,
    isFavorite: favoriteIds.has(venue.id),
  }));
};

const searchVenues = async (searchTerm: string, userId?: string) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const venues = await prisma.venue.findMany({
    where: {
      isActive: true,
      OR: venueSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    },
    take: 20,
    orderBy: { rating: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      area: true,
      category: true,
      heroImage: true,
      bookingUrl: true,
      priceRange: true,
      rating: true,
      createdAt: true,
    },
  });

  let favoriteIds = new Set<string>();
  if (userId) {
    const favorites = await prisma.venueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
    });
    favoriteIds = new Set(favorites.map((fav) => fav.venueId));
  }

  return venues.map((venue) => ({
    ...venue,
    isFavorite: favoriteIds.has(venue.id),
  }));
};

const toggleFavorite = async (venueId: string, userId: string) => {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  const existing = await prisma.venueFavorite.findFirst({
    where: { venueId, userId },
  });

  if (existing) {
    await prisma.venueFavorite.delete({ where: { id: existing.id } });
    return { message: "Venue removed from favorites", action: "delete" };
  } else {
    const created = await prisma.venueFavorite.create({
      data: { venueId, userId },
    });
    return {
      message: "Venue added to favorites",
      action: "create",
      favorite: created,
    };
  }
};

const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const getWhatsOn = async (day?: string, area?: string) => {
  const whereConditions: Prisma.VenueWhereInput = {
    isActive: true,
  };

  if (area) {
    whereConditions.area = area.toUpperCase() as VenueArea;
  }

  const venues = await prisma.venue.findMany({
    where: whereConditions,
    orderBy: { rating: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      category: true,
      heroImage: true,
      bookingUrl: true,
      rating: true,
      weeklySchedule: true,
    },
  });

  if (day) {
    // Return venues with a special night on this specific day
    const validDay = day.toLowerCase();
    if (!VALID_DAYS.includes(validDay as any)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid day. Use: mon, tue, wed, thu, fri, sat, sun"
      );
    }

    return venues
      .filter((venue) => {
        const schedule = venue.weeklySchedule as Record<string, any> | null;
        if (!schedule) return false;
        const dayEntry = schedule[validDay];
        return dayEntry && dayEntry.isSpecial === true;
      })
      .map((venue) => {
        const schedule = venue.weeklySchedule as Record<string, any>;
        return {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          area: venue.area,
          category: venue.category,
          heroImage: venue.heroImage,
          rating: venue.rating,
          tonight: schedule[validDay],
        };
      });
  }

  // No day specified — return all venues grouped by day
  const grouped: Record<string, any[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  for (const venue of venues) {
    const schedule = venue.weeklySchedule as Record<string, any> | null;
    if (!schedule) continue;

    for (const d of VALID_DAYS) {
      const dayEntry = schedule[d];
      if (dayEntry && dayEntry.isSpecial === true) {
        grouped[d].push({
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          area: venue.area,
          category: venue.category,
          heroImage: venue.heroImage,
          rating: venue.rating,
          event: dayEntry,
        });
      }
    }
  }

  return grouped;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pink Pineapple ratings + vibe checks (server-side aggregate, 2026-05-03)
// ─────────────────────────────────────────────────────────────────────────────

const VIBE_FRESHNESS_HOURS = 4;

/// Aggregate Pink Pineapple ratings for a single venue.
const getPpAggregateForVenue = async (venueId: string) => {
  const agg = await prisma.venueRating.aggregate({
    where: { venueId },
    _avg: { score: true },
    _count: { _all: true },
  });
  return {
    ppRating: agg._avg.score ?? null,
    ppRatingCount: agg._count._all,
  };
};

/// Most recent vibe check (last 4 hours) for a single venue, averaged.
const getRecentVibeForVenue = async (venueId: string) => {
  const cutoff = new Date(Date.now() - VIBE_FRESHNESS_HOURS * 60 * 60 * 1000);
  const vibes = await prisma.venueVibe.findMany({
    where: { venueId, createdAt: { gte: cutoff } },
    select: { crowd: true, music: true, energy: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (vibes.length === 0) return null;
  const avg = (key: "crowd" | "music" | "energy") =>
    vibes.reduce((sum, v) => sum + v[key], 0) / vibes.length;
  return {
    crowd: Math.round(avg("crowd")),
    music: Math.round(avg("music")),
    energy: Math.round(avg("energy")),
    count: vibes.length,
    mostRecentAt: vibes[0].createdAt,
  };
};

/// Submit (or update) a user's rating for a venue.
const submitRating = async (venueId: string, userId: string, score: number) => {
  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Score must be an integer 1-5");
  }
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
  if (!venue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  const rating = await prisma.venueRating.upsert({
    where: { userId_venueId: { userId, venueId } },
    create: { userId, venueId, score },
    update: { score },
  });

  const aggregate = await getPpAggregateForVenue(venueId);

  return { rating, aggregate };
};

/// Submit a vibe check (append-only — each report is its own row).
const submitVibe = async (
  venueId: string,
  userId: string,
  crowd: number,
  music: number,
  energy: number
) => {
  for (const [name, val] of [["crowd", crowd], ["music", music], ["energy", energy]] as const) {
    if (val < 0 || val > 4 || !Number.isInteger(val)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `${name} must be an integer 0-4`);
    }
  }
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
  if (!venue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  const vibe = await prisma.venueVibe.create({
    data: { venueId, userId, crowd, music, energy },
  });

  const recentVibe = await getRecentVibeForVenue(venueId);
  return { vibe, recentVibe };
};

/// List the user's accepted past bookings whose venue they haven't rated yet.
/// Returns booking + event + venue details for the bookings page to render
/// "How was last night?" prompts.
const getRatableBookings = async (userId: string) => {
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: "ACCEPTED",
      event: { endDate: { lt: now }, venueId: { not: null } },
    },
    select: {
      id: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          venue: {
            select: {
              id: true,
              name: true,
              slug: true,
              area: true,
              category: true,
              heroImage: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out venues the user has already rated.
  const venueIds = bookings
    .map((b) => b.event.venue?.id)
    .filter((id): id is string => !!id);
  if (venueIds.length === 0) return [];
  const existingRatings = await prisma.venueRating.findMany({
    where: { userId, venueId: { in: venueIds } },
    select: { venueId: true },
  });
  const ratedSet = new Set(existingRatings.map((r) => r.venueId));
  return bookings.filter(
    (b) => b.event.venue && !ratedSet.has(b.event.venue.id)
  );
};

/// List the user's bookings where the event is happening now or ended within
/// the last 24 hours — for "share the vibe" prompts. Wider window than rating
/// because users often vibe-check while there OR the morning after.
const VIBE_PROMPT_WINDOW_HOURS = 24;

/// List the user's favorited venues, with full venue data.
const getFavoriteVenues = async (userId: string) => {
  const favorites = await prisma.venueFavorite.findMany({
    where: { userId },
    select: {
      createdAt: true,
      venue: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          area: true,
          category: true,
          tags: true,
          address: true,
          heroImage: true,
          bookingUrl: true,
          photos: true,
          priceRange: true,
          rating: true,
          googleRating: true,
          googleRatingCount: true,
          isActive: true,
          isFeatured: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  // Flatten + mark isFavorite=true (these are by definition favorites)
  const venues = favorites
    .filter((f) => f.venue !== null)
    .map((f) => ({ ...f.venue!, isFavorite: true }));
  // Attach recent vibes so cards show vibe row when applicable
  const withVibes = await attachRecentVibes(venues);
  return withVibes;
};

const getTonightVibeBookings = async (userId: string) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - VIBE_PROMPT_WINDOW_HOURS * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: "ACCEPTED",
      event: {
        startDate: { lte: now },
        endDate: { gte: cutoff },
        venueId: { not: null },
      },
    },
    select: {
      id: true,
      event: {
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          venue: {
            select: {
              id: true,
              name: true,
              slug: true,
              area: true,
              category: true,
              heroImage: true,
            },
          },
        },
      },
    },
    orderBy: { event: { startDate: "desc" } },
  });
  return bookings;
};

export const venueService = {
  createIntoDb,
  getListFromDb,
  getByArea,
  getByIdFromDb,
  updateIntoDb,
  deleteFromDb,
  getFeatured,
  searchVenues,
  toggleFavorite,
  getWhatsOn,
  submitRating,
  submitVibe,
  getRatableBookings,
  getTonightVibeBookings,
  getFavoriteVenues,
  getPpAggregateForVenue,
  getRecentVibeForVenue,
};
