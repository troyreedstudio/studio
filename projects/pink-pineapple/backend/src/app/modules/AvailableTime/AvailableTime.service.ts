import prisma from "../../../shared/prisma";
import { UserStatus } from '@prisma/client';
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";


const createIntoDb = async (data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.availableTime.create({ data });
    return result;
  });

  return transaction;
};

const getListFromDb = async () => {
  
    const result = await prisma.availableTime.findMany();
    return result;
};

const getByIdFromDb = async (id: string) => {
  
    const result = await prisma.availableTime.findUnique({ where: { id } });
    if (!result) {
      // throw new Error('availableTime not found');
       throw new ApiError(httpStatus.NOT_FOUND,'availableTime not found');
    }
    return result;
  };



const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.availableTime.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.availableTime.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
;

export const availableTimeService = {
createIntoDb,
getListFromDb,
getByIdFromDb,
updateIntoDb,
deleteItemFromDb,
};