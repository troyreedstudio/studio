import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { JwtPayload } from "jsonwebtoken";
import { sendSingleNotificationUtils } from "../Notification/Notification.service";


const toggleLike = async (id: string, user: any) => {
    const prismaTransaction = await prisma.$transaction(async (prisma) => {
      // Check if the post exists
      const isPostExist = await prisma.post.findUnique({
        where: {
          id: id,
        },
      });
  
      if (!isPostExist) {
        throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
      }
  
      // Check if the favorite already exists for the user
      const existingLike = await prisma.like.findFirst({
        where: {
          userId: user.id,
          postId: id,
        },
      });
  
      let result;
      if (existingLike) {
        // If the like exists, remove the favorite and decrement likeCount
        result = await prisma.like.delete({
          where: {
            id: existingLike.id,
          },
        });
  
        // Decrement the like count on the post
        await prisma.post.update({
          where: {
            id: id,
          },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });
        // sendSingleNotificationUtils({
        //   userId: isPostExist.userId,
        //   senderId: user.id,
        //   title: "Like Removed",
        //   body: "Someone unliked your post.",
        // });
      } else {
        // If the like doesn't exist, add the favorite and increment likeCount
        result = await prisma.like.create({
          data: {
            userId: user.id,
            postId: id,
          },
        });
  
        // Increment the like count on the post
        await prisma.post.update({
          where: {
            id: id,
          },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });
        // sendSingleNotificationUtils({
        //   userId: isPostExist.userId,
        //   senderId: user.id,
        //   title: "New Like",
        //   body: "Someone liked your post.",
        // });
      }
  
      return result;
    });
  
    return prismaTransaction;
  };
  
  const getAllMyLikeIds=async(user:JwtPayload)=>{
    const findUser=await prisma.user.findUnique({where:{id:user.id}})
 
    if(!findUser){
      throw new ApiError(httpStatus.NOT_FOUND,"User not found");
    }
    const result=await prisma.like.findMany({
      where:{
        userId:user.id,
      },
      select:{
        postId:true,
      },
    });
    return result.map((item)=>item.postId);
   }

export const LikeService = {
    toggleLike,
    getAllMyLikeIds

};
