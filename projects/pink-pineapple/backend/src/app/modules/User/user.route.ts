import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import { userController } from "./user.controller";
import { AuthController } from "../Auth/auth.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// *!register user
router.post(
  "/register",
  // validateRequest(UserValidation.CreateUserValidationSchema),
  userController.createUser
);
// *!get all  user
router.get("/",auth(), userController.getUsers);
// router.get("/:id",auth(), userController.getUsers);
// *!profile user
router.put(
  "/update-profile",
  // validateRequest(UserValidation.userUpdateSchema),

  auth(),
  fileUploader.updateProfile,
  userController.updateProfile
);

// Compatibility aliases for the Flutter app, which calls /users/profile.
// Live App Store builds (1.2.0+10) point at these — keep them working
// until the next mobile release migrates to /users/update-profile.
router.get("/profile", auth(), AuthController.getMyProfile);
router.post(
  "/profile",
  auth(),
  fileUploader.updateProfile,
  userController.updateProfile
);
router.put(
  "/profile",
  auth(),
  fileUploader.updateProfile,
  userController.updateProfile
);

// *!update  user
router.put("/:id", userController.updateUser);

export const userRoutes = router;
