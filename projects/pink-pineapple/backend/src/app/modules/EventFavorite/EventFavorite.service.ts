import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (data: { eventId: string; userId: string }) => {
  const existing = await prisma.eventFavorite.findFirst({
    where: { userId: data.userId, eventId: data.eventId },
  });

  const transaction = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.eventFavorite.delete({
        where: { id: existing.id },
      });
      return { message: "Event removed from favorites", action: "delete" };
    } else {
      const created = await tx.eventFavorite.create({ data });
      return {
        message: "Event added to favorites",
        action: "create",
        favorite: created,
      };
    }
  });

  return transaction;
};

const getListFromDb = async (userId: string) => {
  const result = await prisma.eventFavorite.findMany({
    where: { userId },
    select: {
      id: true,
      event: {
        select: {
          id: true,
          eventImages: true,
          eventName: true,
          descriptions: true,
          startDate: true,
          endDate: true,
        },
      },
      user: {
        select: {
          id: true,
          fullAddress: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.eventFavorite.findUnique({ where: { id } });
  if (!result) {
    // throw new Error('eventFavorite not found');
    throw new ApiError(httpStatus.NOT_FOUND, "eventFavorite not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.eventFavorite.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.eventFavorite.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const eventFavoriteService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
