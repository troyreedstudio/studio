import prisma from "../../../shared/prisma";
import { UserStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (data: { postId: string; userId: string }) => {
  const transaction = await prisma.$transaction(async (tx) => {
    const existing = await tx.favoritePost.findFirst({
      where: {
        postId: data.postId,
        userId: data.userId,
      },
    });

    if (existing) {
      await tx.favoritePost.delete({
        where: {
          id: existing.id,
        },
      });
      return { status: "removed", postId: data.postId };
    } else {
      const result = await tx.favoritePost.create({ data });
      return { status: "added", postId: result.postId };
    }
  });

  return transaction;
};
const getListFromDb = async (userId: string) => {
  const result = await prisma.favoritePost.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      postId: true,
      user: {
        select: {
          id: true,
          fullAddress: true,
          fullName: true,
          profileImage: true,
        },
      },
      post: {
        select: {
          id: true,
          photos: true,
          text: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              fullAddress: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.favoritePost.findUnique({ where: { id } });
  if (!result) {
    // throw new Error('favoritePost not found');
    throw new ApiError(httpStatus.NOT_FOUND, "favoritePost not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.favoritePost.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.favoritePost.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const favoritePostService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
