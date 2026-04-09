import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { eventFavoriteService } from './EventFavorite.service';

const createEventFavorite = catchAsync(async (req, res) => {
  const result = await eventFavoriteService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'EventFavorite created successfully',
    data: result,
  });
});

const getEventFavoriteList = catchAsync(async (req, res) => {
  const result = await eventFavoriteService.getListFromDb(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'EventFavorite list retrieved successfully',
    data: result,
  });
});

const getEventFavoriteById = catchAsync(async (req, res) => {
  const result = await eventFavoriteService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'EventFavorite details retrieved successfully',
    data: result,
  });
});

const updateEventFavorite = catchAsync(async (req, res) => {
  const result = await eventFavoriteService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'EventFavorite updated successfully',
    data: result,
  });
});

const deleteEventFavorite = catchAsync(async (req, res) => {
  const result = await eventFavoriteService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'EventFavorite deleted successfully',
    data: result,
  });
});

export const EventFavoriteController = {
  createEventFavorite,
  getEventFavoriteList,
  getEventFavoriteById,
  updateEventFavorite,
  deleteEventFavorite,
};