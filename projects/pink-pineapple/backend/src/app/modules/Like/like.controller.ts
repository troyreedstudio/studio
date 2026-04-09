import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LikeService } from "./like.services";


const toggleLike = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user=req.user;
    const result = await LikeService.toggleLike(id,user);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "successfully",
      data: result,
    });
  });
const getAllMyLikeIds = catchAsync(async (req, res) => {
    const user=req.user;
    const result = await LikeService.getAllMyLikeIds(user as JwtPayload);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "successfully",
      data: result,
    });
  });
  export const likeController = {
    toggleLike,
    getAllMyLikeIds
  };