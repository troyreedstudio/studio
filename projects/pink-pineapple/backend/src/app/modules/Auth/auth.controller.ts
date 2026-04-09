import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AuthServices } from "./auth.service";

const loginUser = catchAsync(async (req: Request, res: Response) => {

  const result = await AuthServices.loginUser(req.body);
  res.cookie("token", result.token, { httpOnly: true });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});
const logoutUser = catchAsync(async (req: Request, res: Response) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Successfully logged out",
    data: null,
  });
});

// get user profile
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
const userId=req.user.id;
  const result = await AuthServices.getMyProfile(userId);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User profile retrieved successfully",
    data: result,
  });
});
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
const userId=req.params.id;
  const result = await AuthServices.getMyProfile(userId);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User profile retrieved successfully",
    data: result,
  });
});

// change password
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userToken = req.headers.authorization;
  const { oldPassword, newPassword } = req.body;

  const result = await AuthServices.changePassword(
    userToken as string,
    newPassword,
    oldPassword
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password changed successfully",
    data: result,
  });
});


// forgot password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {

  const result= await AuthServices.forgotPassword(req.body);

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Check your email!",
      data: result
  })
});
const resendOtp = catchAsync(async (req: Request, res: Response) => {

  const result= await AuthServices.resendOtp(req.body.email);

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Check your email!",
      data: result
  })
});
const verifyForgotPasswordOtp = catchAsync(async (req: Request, res: Response) => {

  const result= await AuthServices.verifyForgotPasswordOtp(req.body);

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "otp verification success",
      data: result
  })
});
const verifyRegisterOtp = catchAsync(async (req: Request, res: Response) => {

  const result= await AuthServices.verifyRegisterOtp(req.body);

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "otp verification success!",
      data: result
  })
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {



  await AuthServices.resetPassword( req.body);

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password Reset!",
      data: null
  })
});



export const AuthController = {
  loginUser,
  logoutUser,
  getMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  resendOtp,
  getUserProfile,
  verifyForgotPasswordOtp,
  verifyRegisterOtp
};
