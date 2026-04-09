import prisma from "../../../shared/prisma";
import { UserStatus } from '@prisma/client';
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";


const createIntoDb =  async (data: { blockerId: string; blockedId: string }) => {
  const transaction = await prisma.$transaction(async (tx) => {
    const existingBlock = await tx.blockUser.findFirst({
      where: {
        blockerId: data.blockerId,
        blockedId: data.blockedId,
      },
    });

    if (existingBlock) {
      // 🔓 Unblock
      await tx.blockUser.delete({
        where: { id: existingBlock.id },
      });
      return { action: "unblocked", userId: data.blockedId };
    } else {
      // 🚫 Block
      const result = await tx.blockUser.create({ data });
      return { action: "blocked", userId: data.blockedId, record: result };
    }
  });

  return transaction;
};


const getListFromDb = async (userId:string) => {
  
    const result = await prisma.blockUser.findMany({where:{blockerId:userId},
    
    select:{
      id:true,
      blocked:{
        select:{
          id:true,
          fullAddress:true,
          fullName:true,
          email:true,
          profileImage:true
        }
      }
    }
    }
    );
    return result;
};

const getByIdFromDb = async (id: string) => {
  
    const result = await prisma.blockUser.findUnique({ where: { id } });
    if (!result) {
      // throw new Error('blockUser not found');
       throw new ApiError(httpStatus.NOT_FOUND,'blockUser not found');
    }
    return result;
  };



const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.blockUser.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.blockUser.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
;

export const blockUserService = {
createIntoDb,
getListFromDb,
getByIdFromDb,
updateIntoDb,
deleteItemFromDb,
};