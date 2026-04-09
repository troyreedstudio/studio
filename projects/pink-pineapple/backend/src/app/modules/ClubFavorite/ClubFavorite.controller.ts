import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { clubFavoriteService } from './ClubFavorite.service';

const createClubFavorite = catchAsync(async (req, res) => {
  const result = await clubFavoriteService.toggleFavoriteClub(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'ClubFavorite created successfully',
    data: result,
  });
});

const getClubFavoriteList = catchAsync(async (req, res) => {
  const result = await clubFavoriteService.getListFromDb(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubFavorite list retrieved successfully',
    data: result,
  });
});

const getClubFavoriteById = catchAsync(async (req, res) => {
  const result = await clubFavoriteService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubFavorite details retrieved successfully',
    data: result,
  });
});

const updateClubFavorite = catchAsync(async (req, res) => {
  const result = await clubFavoriteService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubFavorite updated successfully',
    data: result,
  });
});

const deleteClubFavorite = catchAsync(async (req, res) => {
  const result = await clubFavoriteService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClubFavorite deleted successfully',
    data: result,
  });
});

export const ClubFavoriteController = {
  createClubFavorite,
  getClubFavoriteList,
  getClubFavoriteById,
  updateClubFavorite,
  deleteClubFavorite,
};