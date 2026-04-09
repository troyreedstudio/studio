import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { availableDaysService } from './AvailableDays.service';

const createAvailableDays = catchAsync(async (req, res) => {
  const result = await availableDaysService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'AvailableDays created successfully',
    data: result,
  });
});

const getAvailableDaysList = catchAsync(async (req, res) => {
  const result = await availableDaysService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableDays list retrieved successfully',
    data: result,
  });
});

const getAvailableDaysById = catchAsync(async (req, res) => {
  const result = await availableDaysService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableDays details retrieved successfully',
    data: result,
  });
});

const updateAvailableDays = catchAsync(async (req, res) => {
  const result = await availableDaysService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableDays updated successfully',
    data: result,
  });
});

const deleteAvailableDays = catchAsync(async (req, res) => {
  const result = await availableDaysService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AvailableDays deleted successfully',
    data: result,
  });
});

export const AvailableDaysController = {
  createAvailableDays,
  getAvailableDaysList,
  getAvailableDaysById,
  updateAvailableDays,
  deleteAvailableDays,
};