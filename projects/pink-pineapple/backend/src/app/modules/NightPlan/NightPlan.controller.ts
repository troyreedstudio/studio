import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { NightPlanService } from "./NightPlan.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await NightPlanService.create(req as any);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Night plan saved",
    data: result,
  });
});

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await NightPlanService.listMine(req as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your night plans",
    data: result,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NightPlanService.getById(req as any, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Night plan",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NightPlanService.update(req as any, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Night plan updated",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NightPlanService.remove(req as any, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Night plan deleted",
    data: result,
  });
});

export const NightPlanController = {
  create,
  listMine,
  getById,
  update,
  remove,
};
