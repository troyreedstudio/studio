import { Request, Response } from 'express';
import { FollowService } from './Follow.service';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// Controller to get the list of friends
const getFriendList = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload; // Get the user from the authenticated request

  const friends = await FollowService.getFriendList(user.id);
  const friendCount = friends.length;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Friends fetched successfully.',
    data: { count: friendCount, friends: friends },
  });
});

// Controller to get the list of pending connection requests
const getPendingRequestsList = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload; // Get the user from the authenticated request

    const pendingRequests = await FollowService.getPendingRequestsList(user.id);
    const pendingRequestsCount = pendingRequests.length;

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Pending connection requests fetched successfully.',
      data: { count: pendingRequestsCount, pendingRequests },
    });
  },
);

// Controller to send a connection request
const sendConnectionRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { followingId } = req.body;
    const user = req.user as JwtPayload;

    const result = await FollowService.sendConnectionRequest(
      user.id,
      followingId,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Connection request sent successfully.',
      data: result,
    });
  },
);

// Controller to accept a connection request
const acceptConnectionRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { requestId } = req.body;
    const user = req.user as JwtPayload;

    const result = await FollowService.acceptConnectionRequest(
      user.id,
      requestId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Connection request accepted.',
      data: result,
    });
  },
);

// Controller to decline a connection request
const declineConnectionRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const user = req.user as JwtPayload;

    const result = await FollowService.declineConnectionRequest(
      user.id,
      requestId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Connection request declined.',
      data: result,
    });
  },
);

// Controller to get the connection requests sent by the user
const getMyConnectionRequest = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await FollowService.getMyConnectionRequest(user.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Connection requests retrieved successfully.',
      data: result,
    });
  },
);

// Controller to get the requests that the user has sent
const getMySendRequest = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await FollowService.getMySendRequest(user.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sent connection requests retrieved successfully.',
      data: result,
    });
  },
);
const getFollowAndFollowing = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await FollowService.getFollowAndFollowing(user.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'follower and following retrieved successfully.',
      data: result,
    });
  },
);

export const FollowController = {
  getFriendList,
  getPendingRequestsList,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getMyConnectionRequest,
  getMySendRequest,
  getFollowAndFollowing
};
