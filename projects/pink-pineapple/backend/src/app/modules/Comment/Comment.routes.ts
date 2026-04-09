// Comment.routes: Module file for the Comment.routes functionality.
import express from "express";
import { CommentController } from "./Comment.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// Add a comment
router.post("/", auth(), CommentController.addComment);

//get comment by comment id
router.get("/:id", auth(), CommentController.getCommentById);

// Update a comment
router.put("/:id", auth(), CommentController.updateComment);

// Delete a comment
router.delete("/:id", auth(), CommentController.deleteComment);

// Get all comments by post ID
router.get("/post/:postId", auth(), CommentController.getCommentsByPostId);

export const CommentRoutes = router;
