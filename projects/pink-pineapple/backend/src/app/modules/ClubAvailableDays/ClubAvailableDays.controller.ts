import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { clubAvailableDaysService } from './ClubAvailableDays.service';

const createClubAvailableDays = catchAsync(async (req, res) => {
  const userId=req.user.id;
  const result = await clubAvailableDaysService.createIntoDb(req.body.dayIds,userId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'ClubAvailableDays created successfully',
    data: result,
  });
});

const getClubAvailableDaysList = catchAsync(async (req, res) => {
  const userId=req.user.id;
  const result = await clubAvailableDaysService.getListFromDb(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableDays list retrieved successfully',
    data: result,
  });
});

const getClubAvailableDaysById = catchAsync(async (req, res) => {
  const result = await clubAvailableDaysService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableDays details retrieved successfully',
    data: result,
  });
});

const updateClubAvailableDays = catchAsync(async (req, res) => {
  const result = await clubAvailableDaysService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableDays updated successfully',
    data: result,
  });
});

const deleteClubAvailableDays = catchAsync(async (req, res) => {
  const result = await clubAvailableDaysService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableDays deleted successfully',
    data: result,
  });
});

export const ClubAvailableDaysController = {
  createClubAvailableDays,
  getClubAvailableDaysList,
  getClubAvailableDaysById,
  updateClubAvailableDays,
  deleteClubAvailableDays,
};