import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { favoritePostService } from './FavoritePost.service';

const createFavoritePost = catchAsync(async (req, res) => {
  req.body.userId=req.user.id;
  const result = await favoritePostService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'FavoritePost created successfully',
    data: result,
  });
});

const getFavoritePostList = catchAsync(async (req, res) => {
  const result = await favoritePostService.getListFromDb(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FavoritePost list retrieved successfully',
    data: result,
  });
});

const getFavoritePostById = catchAsync(async (req, res) => {
  const result = await favoritePostService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FavoritePost details retrieved successfully',
    data: result,
  });
});

const updateFavoritePost = catchAsync(async (req, res) => {
  const result = await favoritePostService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FavoritePost updated successfully',
    data: result,
  });
});

const deleteFavoritePost = catchAsync(async (req, res) => {
  const result = await favoritePostService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FavoritePost deleted successfully',
    data: result,
  });
});

export const FavoritePostController = {
  createFavoritePost,
  getFavoritePostList,
  getFavoritePostById,
  updateFavoritePost,
  deleteFavoritePost,
};