// Follow.service: Module file for the Follow.service functionality.

import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import { FollowerStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import { sendSingleNotificationUtils } from "../Notification/Notification.service";

const getFriendList = async (userId: string) => {
  const followers = await prisma.follower.findMany({
    where: {
      OR: [
        { followingId: userId, status: FollowerStatus.ACCEPTED },
        { followerId: userId, status: FollowerStatus.ACCEPTED },
      ],
    },
    select: {
      id: true,
      followerId: true,
      followingId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      follower: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
      following: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  const result = followers.map((follower) => ({
    id: follower.id,
    followerId: follower.followerId,
    followingId: follower.followingId,
    status: follower.status,
    createdAt: follower.createdAt,
    updatedAt: follower.updatedAt,
    user:
      follower.followerId === userId ? follower.following : follower.follower,
  }));
  return result;
};

// Method to get the list of pending connection requests for a user
const getPendingRequestsList = async (userId: string) => {
  const pendingRequests = await prisma.follower.findMany({
    where: {
      followingId: userId,
      status: FollowerStatus.PENDING,
    },
  });

  return pendingRequests;
};

// Method to send a connection request
// Method to send a connection request
const sendConnectionRequest = async (userId: string, followingId: string) => {
  if (userId === followingId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You cannot send a connection request to yourself."
    );
  }
  // Check if a connection request already exists
  const existingRequest = await prisma.follower.findFirst({
    where: {
      followerId: userId,
      followingId: followingId,
    },
  });
  if (existingRequest) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Connection request already sent."
    );
  }
  // Create a new connection request
  const newRequest = await prisma.follower.create({
    data: {
      followerId: userId,
      followingId: followingId,
      status: FollowerStatus.PENDING,
    },
  });
  // sendSingleNotificationUtils({
  //   userId: followingId,
  //   senderId: userId,
  //   title: "New Connection Request",
  //   body: "You have a new connection request.",
  // });
  return newRequest;
};

// Method to accept a connection request
const acceptConnectionRequest = async (userId: string, requestId: string) => {
  const request = await prisma.follower.findUnique({
    where: { id: requestId },
  });

  if (!request || request.followingId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Connection request not found.");
  }
  if (request.status !== FollowerStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Connection request is not in a pending state."
    );
  }
  const updatedRequest = await prisma.follower.update({
    where: { id: requestId },
    data: { status: FollowerStatus.ACCEPTED },
  });

  // sendSingleNotificationUtils({
  //   userId: request.followerId,
  //   senderId: userId,
  //   title: "Connection Request Accepted",
  //   body: "Your connection request has been accepted.",
  // });

  return updatedRequest;
};

// Method to decline a connection request
const declineConnectionRequest = async (userId: string, requestId: string) => {
  const request = await prisma.follower.findUnique({
    where: { id: requestId },
  });
  if (!request || request.followingId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Connection request not found.");
  }
  if (request.status !== FollowerStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Connection request is not in a pending state."
    );
  }
  const deletedRequest = await prisma.follower.delete({
    where: { id: requestId },
  });
  // sendSingleNotificationUtils({
  //   userId: request.followerId,
  //   senderId: userId,
  //   title: "Connection Request Declined",
  //   body: "Your connection request has been declined.",
  // });
  return deletedRequest;
};

// Method to get the connection requests sent by the user
const getMyConnectionRequest = async (userId: string) => {
  const receivedRequests = await prisma.follower.findMany({
    where: {
      followingId: userId,
      status: FollowerStatus.PENDING,
    },
    select: {
      id: true,
      followerId: true,
      followingId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      follower: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
      following: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  return receivedRequests;
};

const getMySendRequest = async (userId: string) => {
  // Fetch pending requests sent by the user

  const sentRequests = await prisma.follower.findMany({
    where: {
      followerId: userId,
      status: FollowerStatus.PENDING,
    },
    select: {
      id: true,
      followerId: true,
      followingId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      following: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  return sentRequests;
};

const getFollowAndFollowing = async (userId: string) => {
const followerRecords = await prisma.follower.findMany({
  where: { followingId: userId },
  select: {
    follower: {
      select: {
        id: true,
        fullAddress: true,
        fullName: true,
        profileImage: true,
      },
    },
  },
});

const followingRecords = await prisma.follower.findMany({
  where: { followerId: userId },
  select: {
    following: {
      select: {
        id: true,
        fullAddress: true,
        fullName: true,
        profileImage: true,
      },
    },
  },
});

// Flatten to plain arrays
const follower = followerRecords.map((record) => record.follower);
const following = followingRecords.map((record) => record.following);
  return { follower, following };
};
export const FollowService = {
  getFriendList,
  getPendingRequestsList,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getMyConnectionRequest,
  getMySendRequest,
  getFollowAndFollowing,
};
