import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.availableDays.create({ data });
    return result;
  });

  return transaction;
};

const getListFromDb = async () => {
  const result = await prisma.availableDays.findMany();
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.availableDays.findUnique({ where: { id } });
  if (!result) {
    // throw new Error('availableDays not found');
    throw new ApiError(httpStatus.NOT_FOUND, "availableDays not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.availableDays.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.availableDays.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const availableDaysService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
