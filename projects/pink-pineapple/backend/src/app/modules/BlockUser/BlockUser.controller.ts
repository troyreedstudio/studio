import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { blockUserService } from './BlockUser.service';

const createBlockUser = catchAsync(async (req, res) => {
  req.body.blockerId=req.user.id;
  const result = await blockUserService.createIntoDb(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'BlockUser created successfully',
    data: result,
  });
});

const getBlockUserList = catchAsync(async (req, res) => {
  const result = await blockUserService.getListFromDb(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BlockUser list retrieved successfully',
    data: result,
  });
});

const getBlockUserById = catchAsync(async (req, res) => {
  const result = await blockUserService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BlockUser details retrieved successfully',
    data: result,
  });
});

const updateBlockUser = catchAsync(async (req, res) => {
  const result = await blockUserService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BlockUser updated successfully',
    data: result,
  });
});

const deleteBlockUser = catchAsync(async (req, res) => {
  const result = await blockUserService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BlockUser deleted successfully',
    data: result,
  });
});

export const BlockUserController = {
  createBlockUser,
  getBlockUserList,
  getBlockUserById,
  updateBlockUser,
  deleteBlockUser,
};