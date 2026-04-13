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

  return {
    meta: { page, limit, total },
    data: enrichedVenues,
  };
};

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
      isActive: true,
      isFeatured: true,
      rating: true,
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

  return { ...result, isFavorite };
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
};
