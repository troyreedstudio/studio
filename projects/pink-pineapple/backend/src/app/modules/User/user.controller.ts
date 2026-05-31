  import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";
import { Request, Response } from "express";
import pick from "../../../shared/pick";
import { userFilterableFields } from "./user.costant";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUserIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Registered successfully!",
    data: result,
  });
});



// get all user form db
const getUsers = catchAsync(async (req: Request, res: Response) => {
const userId=req.user.id;
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])

  const result = await userService.getUsersFromDb(filters, options,userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieve successfully!",
    data: result,
  });
});


// get all user form db
const updateProfile = catchAsync(async (req: Request & {user?:any}, res: Response) => {
  const user = req?.user;

  const result = await userService.updateProfile(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully!",
    data: result,
  });
});


// *! update user role and account status
const updateUser = catchAsync(async (req: Request, res: Response) => {
const id = req.params.id;
  const result = await userService.updateUserIntoDb( req.body,id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully!",
    data: result,
  });
});


// Flutter posts here after capturing an FCM token from firebase_messaging.
// Body shape: { fcmToken: string }. Auth required. The token is stored on
// the user row and used by Notification.service for push delivery.
const updateFcmToken = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?.id;
    const token = (req.body?.fcmToken ?? "").toString();
    const result = await userService.updateFcmToken(userId, token);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "FCM token saved",
      data: result,
    });
  }
);

export const userController = {
  createUser,
  getUsers,
  updateProfile,
  updateUser,
  updateFcmToken,
};
