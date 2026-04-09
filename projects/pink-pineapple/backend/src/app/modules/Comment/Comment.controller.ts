// Comment.controller: Module file for the Comment.controller functionality.
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { CommentService } from "./Comment.service";

const addComment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await CommentService.addComment(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;

  const result = await CommentService.updateComment(user, req.body, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment updated successfully",
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;
  const result = await CommentService.deleteComment(user, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

const getCommentsByPostId = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const result = await CommentService.getCommentsByPostId(postId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: result,
  });
});

const getCommentById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommentService.getCommentById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: result,
  });
});

export const CommentController = {
  addComment,
  updateComment,
  deleteComment,
  getCommentsByPostId,
  getCommentById
};
