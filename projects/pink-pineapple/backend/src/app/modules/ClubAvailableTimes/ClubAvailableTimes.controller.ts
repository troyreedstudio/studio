import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { clubAvailableTimesService } from './ClubAvailableTimes.service';

const createClubAvailableTimes = catchAsync(async (req, res) => {
  const result = await clubAvailableTimesService.createIntoDb(req.body.timesId,req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'ClubAvailableTimes created successfully',
    data: result,
  });
});

const getClubAvailableTimesList = catchAsync(async (req, res) => {
  const userId=req.user.id;
  const result = await clubAvailableTimesService.getListFromDb(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableTimes list retrieved successfully',
    data: result,
  });
});

const getClubAvailableTimesById = catchAsync(async (req, res) => {
  const result = await clubAvailableTimesService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableTimes details retrieved successfully',
    data: result,
  });
});

const updateClubAvailableTimes = catchAsync(async (req, res) => {
  const result = await clubAvailableTimesService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableTimes updated successfully',
    data: result,
  });
});

const deleteClubAvailableTimes = catchAsync(async (req, res) => {
  const result = await clubAvailableTimesService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubAvailableTimes deleted successfully',
    data: result,
  });
});

export const ClubAvailableTimesController = {
  createClubAvailableTimes,
  getClubAvailableTimesList,
  getClubAvailableTimesById,
  updateClubAvailableTimes,
  deleteClubAvailableTimes,
};