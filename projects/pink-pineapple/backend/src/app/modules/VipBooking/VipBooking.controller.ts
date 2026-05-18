import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { VipBookingService } from "./VipBooking.service";

const createRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await VipBookingService.createRequest(req as any);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "VIP table request created",
    data: result,
  });
});

const markWhatsappOpened = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VipBookingService.markWhatsappOpened(req as any, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "WhatsApp open recorded",
    data: result,
  });
});

const listMyRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await VipBookingService.listMyRequests(req as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your VIP requests",
    data: result,
  });
});

const listAllRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await VipBookingService.listAllRequests(req as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All VIP requests",
    data: result,
  });
});

const getRequestById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VipBookingService.getRequestById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "VIP request",
    data: result,
  });
});

const updateRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VipBookingService.updateRequest(req, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "VIP request updated",
    data: result,
  });
});

export const VipBookingController = {
  createRequest,
  markWhatsappOpened,
  listMyRequests,
  listAllRequests,
  getRequestById,
  updateRequest,
};
