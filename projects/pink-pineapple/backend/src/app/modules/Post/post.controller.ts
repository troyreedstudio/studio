import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { postFilterableFields } from "./post.constant";
import { postServices } from "./post.services";

// Create a post
const addPost = catchAsync(async (req, res) => {
  const result = await postServices.addPost(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Post created successfully",
    data: result,
  });
});

// Get a post by ID
const getPostById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await postServices.getPostById(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Post retrieved successfully",
    data: result,
  });
});

// Get all posts (with pagination)
// const getAllPosts = catchAsync(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const result = await postServices.getAllPosts(Number(page), Number(limit));
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "Posts retrieved successfully",
//     data: result,
//   });
// });

const getAllPosts = catchAsync(async (req, res) => {
  const filters = pick(req.query, postFilterableFields); // e.g., ['category', 'status']
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await postServices.getAllPosts(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts retrieved successfully!",
    data: result,
  });
});
// Update a post by ID
const updatePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const result = await postServices.updatePost(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Post updated successfully",
    data: result,
  });
});

// Delete a post by ID
const deletePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await postServices.deletePost(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Post deleted successfully",
    data: result,
  });
});

// Get posts by user ID
const getPostByUserId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await postServices.getPostByUserId(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,

    message: "Posts by user retrieved successfully",
    data: result,
  });
});
// Get posts by user ID
const getMyPosts = catchAsync(async (req, res) => {
  const userId=req.user.id;
  const result = await postServices.getPostByUserId(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,

    message: "Posts by user retrieved successfully",
    data: result,
  });
});
// Hide/Unhide a post by ID
const hideUnhidePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await postServices.hideUnhidePost(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Post visibility toggled successfully",
    data: result,
  });
} );
export const postController = {
  addPost,
  getPostById,
  getAllPosts,
  updatePost,
  deletePost,
  getPostByUserId,
  hideUnhidePost,
  getMyPosts
};
