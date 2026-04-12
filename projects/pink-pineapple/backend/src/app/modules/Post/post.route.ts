import { Router } from "express";
import { postController } from "./post.controller";
import { fileUploader } from "../../../helpers/fileUploader";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();

// Add a new post
router.post(
  '/add-post',
  fileUploader.uploadPost,
  auth(UserRole.ADMIN, UserRole.USER),
  postController.addPost
);

// Get all posts
router.get('/posts', postController.getAllPosts);
router.get('/get-my-posts',auth(), postController.getMyPosts);

// Get a post by ID
router.get('/posts/:id', postController.getPostById);
// Get posts by user ID
router.get('/user-posts/:id', auth(UserRole.ADMIN, UserRole.USER), postController.getPostByUserId);

// Update a post by ID
router.put(
  '/update-posts/:id',
  fileUploader.uploadPost,
  auth(UserRole.ADMIN, UserRole.USER),
  postController.updatePost
);
  //hide/unhide post
router.put(
  '/hide-unhide-post/:id',
  auth(UserRole.ADMIN,UserRole.USER),
  postController.hideUnhidePost
);

// Delete a post by ID
router.delete(
  '/posts/:id',
  auth(UserRole.ADMIN,UserRole.USER),
  postController.deletePost
);

export const PostRouter = router;
