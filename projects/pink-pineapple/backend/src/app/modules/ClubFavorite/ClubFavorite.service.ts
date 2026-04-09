import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const toggleFavoriteClub = async (data: { userId: string; clubId: string }) => {
  const existing = await prisma.clubFavorite.findFirst({
    where: { userId: data.userId, clubId: data.clubId },
  });

  const transaction = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.clubFavorite.delete({
        where: { id: existing.id },
      });
      return { message: "Club removed from favorites", action: "delete" };
    } else {
      const created = await tx.clubFavorite.create({ data });
      return {
        message: "Club added to favorites",
        action: "create",
        favorite: created,
      };
    }
  });

  return transaction;
};

const getListFromDb = async (userId: string) => {
  const result = await prisma.clubFavorite.findMany({
    where: { userId: userId },
    select: {
      id: true,
      club: {
        select: {
          id: true,
          profileImage: true,
          fullName: true,
          email: true,
          fullAddress: true,
        },
      },
      user: {
        select: {
          id: true,
          profileImage: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.clubFavorite.findUnique({ where: { id } });
  if (!result) {
    // throw new Error('clubFavorite not found');
    throw new ApiError(httpStatus.NOT_FOUND, "clubFavorite not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.clubFavorite.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.clubFavorite.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const clubFavoriteService = {
  toggleFavoriteClub,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
