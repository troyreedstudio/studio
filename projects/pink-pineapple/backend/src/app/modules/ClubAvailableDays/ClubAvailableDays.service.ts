import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (data: any, userId: string) => {


  const formattedData = data.map((item: string) => {
    return {
      clubId: userId,
      availableDaysId: item,
    };
  });

  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.clubAvailableDays.createMany({
      data: formattedData,
    });
    return result;
  });

  return transaction;
};

const getListFromDb = async (userId: string) => {
  const result = await prisma.clubAvailableDays.findMany({
    where: { clubId: userId },
    select: {
      clubId: true,
      availableDaysId: true,
      availableDays: {
        select: {
          id: true,
          day: true,
        },
      },
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.clubAvailableDays.findUnique({ where: { id } });
  if (!result) {
    // throw new Error('clubAvailableDays not found');
    throw new ApiError(httpStatus.NOT_FOUND, "clubAvailableDays not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.clubAvailableDays.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.clubAvailableDays.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const clubAvailableDaysService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
