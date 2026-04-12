import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (data: any[], userId: string) => {
  const formattedDataPromises = data.map(async (item: string) => {
    try {
      const isExist = await prisma.availableTime.findFirst({
        where: { id: item },
      });
      const isExistTime = await prisma.clubAvailableTimes.findFirst({
        where: { availableTimesId: item, clubId: userId },
      });

      if (isExistTime) {
        return { error: `this item is already exist ${item}` };
      }
      if (!isExist) {
        return { error: `Data not found for ID: ${item}` };
      }

      return {
        clubId: userId,
        availableTimesId: item,
      };
    } catch (error: any) {
      return { error: `Error checking ID: ${item}, ${error.message}` };
    }
  });

  const formattedData = await Promise.all(formattedDataPromises);

  const validData = formattedData.filter((item) => !item.error);
  const errors = formattedData.filter((item) => item.error);

  let transactionResult = null;
  if (validData.length > 0) {
    transactionResult = await prisma.$transaction(async (prisma) => {
      const result = await prisma.clubAvailableTimes.createMany({
        data: validData as any,
      });
      return result;
    });
  }

  const successResponse: any = {
    success: true,
    successIds: validData.map((item: any) => item.availableTimesId),
  };

  if (errors.length > 0) {
    successResponse.errors = errors;
  }

  return successResponse;
};

const getListFromDb = async (userId: string) => {
  const result = await prisma.clubAvailableTimes.findMany({
    where: { clubId: userId },
    select: {
      id: true,
      clubId: true,
      availableTimesId: true,
      club: {
        select: {
          id: true,
          fullName: true,
          fullAddress: true,
          profileImage: true,
        },
      },
      availableTimes:{
        select: {
          id: true,
          time: true,
          createdAt: true,
          updatedAt: true,
        }
      }
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.clubAvailableTimes.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "clubAvailableTimes not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.clubAvailableTimes.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.clubAvailableTimes.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const clubAvailableTimesService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
