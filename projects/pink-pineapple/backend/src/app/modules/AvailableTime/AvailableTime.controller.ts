import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { availableTimeService } from './AvailableTime.service';

const createAvailableTime = catchAsync(async (req, res) => {
  const result = await availableTimeService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'AvailableTime created successfully',
    data: result,
  });
});

const getAvailableTimeList = catchAsync(async (req, res) => {
  const result = await availableTimeService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableTime list retrieved successfully',
    data: result,
  });
});

const getAvailableTimeById = catchAsync(async (req, res) => {
  const result = await availableTimeService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableTime details retrieved successfully',
    data: result,
  });
});

const updateAvailableTime = catchAsync(async (req, res) => {
  const result = await availableTimeService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableTime updated successfully',
    data: result,
  });
});

const deleteAvailableTime = catchAsync(async (req, res) => {
  const result = await availableTimeService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableTime deleted successfully',
    data: result,
  });
});

export const AvailableTimeController = {
  createAvailableTime,
  getAvailableTimeList,
  getAvailableTimeById,
  updateAvailableTime,
  deleteAvailableTime,
};