import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

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

const getUserFavorites = async (userId: string) => {
  const result = await prisma.venueFavorite.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      venue: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          area: true,
          category: true,
          heroImage: true,
          photos: true,
          priceRange: true,
          rating: true,
          address: true,
          isFeatured: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return result;
};

export const venueFavoriteService = {
  toggleFavorite,
  getUserFavorites,
};
