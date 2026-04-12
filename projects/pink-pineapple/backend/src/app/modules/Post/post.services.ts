import { Request } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import { JwtPayload } from "jsonwebtoken";
import { CloudFormation } from "aws-sdk";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { Prisma } from "@prisma/client";
import { IPostFilterRequest } from "./post.interface";
import { clubFavoriteService } from "../ClubFavorite/ClubFavorite.service";

const addPost = async (req: Request) => {
  try {
    const loginUser = req.user as JwtPayload;

    const videoFiles =
      (req.files as { [fieldname: string]: Express.Multer.File[] })["videos"] ||
      [];
    const photoFiles =
      (req.files as { [fieldname: string]: Express.Multer.File[] })["photos"] ||
      [];
    let payload;
    if (req.body.data) {
      payload = JSON.parse(req.body.data);
    }
    const user = await prisma.user.findFirstOrThrow({
      where: { id: loginUser.id },
    });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
    }

    // Upload photos and videos concurrently
    const uploadPhotoPromises = photoFiles.map((photo) =>
      fileUploader.uploadToCloudinary(photo)
    );
    const uploadVideoPromises = videoFiles.map((video) =>
      fileUploader.uploadToCloudinary(video)
    );

    const [photoResults, videoResults] = await Promise.all([
      Promise.all(uploadPhotoPromises),
      Promise.all(uploadVideoPromises),
    ]);

    // Save metadata for videos and photos
    const savedPhotos = photoResults.map((result) => ({
      url: result.Location,
    }));
    const savedVideos = videoResults.map((result) => ({
      url: result.Location,
    }));

    const data = {
      ...payload,
      photos: savedPhotos,
videos:savedVideos,
      userId: loginUser.id,
    };

    const result = await prisma.post.create({ data });

    return result;
  } catch (error: any) {
    console.error("Error uploading files:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Get a post by its ID
const getPostById = async (id: string) => {
  try {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id },
      include: {
        comments: true,
        _count: true,
      },
    });
    return post;
  } catch (error: any) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found!");
  }
};

// Get all posts (optionally paginate)
// const getAllPosts = async (page: number = 1, limit: number = 10) => {
//   const posts = await prisma.post.findMany({
//     skip: (page - 1) * limit,
//     take: limit,
//     orderBy: {
//       createdAt: "desc", // Ordering by 'createdAt' in descending order
//     },
//     include: {
//       user: {
//         select: {
//           id: true,
//           fullName: true,
//           email: true,
//           profileImage: true,
//           fullAddress:true
//         },
//       },
//       comments: true,
//       _count: true,
//     },
//   });
//   return posts;
// };
const getAllPosts = async (
  params: IPostFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PostWhereInput[] = [];

  // 🔍 Search by title or content
  if (searchTerm) {
    andConditions.push({
      OR: [
        { text: { contains: searchTerm, mode: "insensitive" } },
      
      ],
    });
  }
  //🎯 Apply filters (e.g., category, status)
if (Object.keys(filterData).length > 0) {
  const filterConditions = Object.entries(filterData).map(([key, value]) => {
    if (key === "isHidden") {
      // Example: skip this filter or handle it differently
      return { isHidden: { equals: value=="false"?false:true } };
    }

    return { [key]: { equals: value } };
  });

  andConditions.push({ AND: filterConditions });
}

const whereConditions: Prisma.PostWhereInput = andConditions.length
? { AND: andConditions }
: {};


  // 📦 Fetch paginated posts
  const posts = await prisma.post.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          fullAddress: true,
        },
      },
      comments: true,
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  const total = await prisma.post.count({ where: whereConditions });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: posts,
  };
};
// Update a post by its ID
const updatePost = async (req: Request) => {
  try {
    const loginUser = req.user as JwtPayload;
    const { id } = req.params; // Assuming post ID is passed in the URL parameters
    const videoFiles =
      (req.files as { [fieldname: string]: Express.Multer.File[] })["videos"] ||
      [];
    const photoFiles =
      (req.files as { [fieldname: string]: Express.Multer.File[] })["photos"] ||
      [];
    let payload;
    if (req.body.data) {
      payload = JSON.parse(req.body.data);
    }

    // Verify the post exists and belongs to the logged-in user
    const existingPost = await prisma.post.findFirst({
      where: {
        id,
        userId: loginUser.id, // Ensures the user owns the post
      },
    });

    if (!existingPost) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Post not found or you do not have permission to update it!"
      );
    }
    // Upload photos and videos concurrently
    const uploadPhotoPromises = photoFiles.map((photo) =>
      fileUploader.uploadToCloudinary(photo)
    );
    const uploadVideoPromises = videoFiles.map((video) =>
      fileUploader.uploadToCloudinary(video)
    );

    const [photoResults, videoResults] = await Promise.all([
      Promise.all(uploadPhotoPromises),
      Promise.all(uploadVideoPromises),
    ]);

    // Save metadata for new videos and photos
    const savedPhotos = photoResults.map((result) => ({
      url: result.Location,
    }));
    const savedVideos = videoResults.map((result) => ({
      url: result.Location,
    }));

    // Prepare data for the update
    const updateData = {
      ...payload,
      photos: [...savedPhotos], // Merge new and existing photos
      videos: [...savedVideos], // Merge new and existing videos
    };

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    return updatedPost;
  } catch (error: any) {
    console.error("Error updating post:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Delete a post by its ID
const deletePost = async (id: string) => {
  const existingPost = await prisma.post.findUnique({
    where: { id },
  });
  if (!existingPost) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found!1");
  }

  const deletedPost = await prisma.post.delete({
    where: { id: id },
  });
  return deletedPost;
};

const getPostByUserId = async (userId: string) => {
  
  const posts = await prisma.post.findMany({
    where: { userId },  
    include: {
      comments: true,
      _count: true,   
    },
  });
  return posts;
};




const hideUnhidePost = async (postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  }); 
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found!");
  }
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: { isHidden: !post.isHidden },
  });
  return updatedPost;
}
export const postServices = {
  addPost,
  getPostById,
  getAllPosts,
  getPostByUserId,
  updatePost,
  deletePost,
  hideUnhidePost,
};
