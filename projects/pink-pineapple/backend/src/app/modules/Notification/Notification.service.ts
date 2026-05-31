import httpStatus from 'http-status';
import admin from './firebaseAdmin';
import ApiError from '../../../errors/ApiErrors';
import prisma from '../../../shared/prisma';
type SendNotificationParams = {
  userId: string;
  senderId: string;
  title: string;
  body: string;
};

export const sendSingleNotificationUtils = async ({
  userId,
  senderId,
  title,
  body,
}: SendNotificationParams) => {
  if (!title || !body) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Title and body are required");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found with FCM token");
    }

    const message = {
      notification: { title, body },
      token: user.fcmToken,
    };

    // Save in DB
    await prisma.notification.create({
      data: { receiverId: userId, senderId, title, body },
    });

    // Send via Firebase
    return await admin.messaging().send(message);
  } catch (error: any) {
    console.error("Error sending notification:", error);

    switch (error.code) {
      case "messaging/invalid-registration-token":
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FCM registration token");
      case "messaging/registration-token-not-registered":
        throw new ApiError(httpStatus.NOT_FOUND, "FCM token is no longer registered");
      default:
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message || "Failed to send notification");
    }
  }
};

// Send notification to a single user
const sendSingleNotification = async (req: any) => {
  try {
    const { userId } = req.params;
    const { title, body } = req.body;

    if (!title || !body) {
      throw new ApiError(400, 'Title and body are required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.fcmToken) {
      throw new ApiError(404, 'User not found with FCM token');
    }

    const message = {
      notification: {
        title,
        body,
      },
      token: user.fcmToken,
    };

    await prisma.notification.create({
      data: {
        receiverId: userId,
        senderId: req.user.id,
        title,
        body,
      },
    });

    const response = await admin.messaging().send(message);
    return response;
  } catch (error: any) {
    console.error('Error sending notification:', error);
    if (error.code === 'messaging/invalid-registration-token') {
      throw new ApiError(400, 'Invalid FCM registration token');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      throw new ApiError(404, 'FCM token is no longer registered');
    } else {
      throw new ApiError(500, error.message || 'Failed to send notification');
    }
  }
};

// Send notifications to all users with valid FCM tokens
const sendNotifications = async (req: any) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      throw new ApiError(400, 'Title and body are required');
    }

    const users = await prisma.user.findMany({
      where: {
        fcmToken: {
          not: null,
        },
      },
      select: {
        id: true,
        fcmToken: true,
      },
    });

    if (!users || users.length === 0) {
      throw new ApiError(404, 'No users found with FCM tokens');
    }

    const fcmTokens = users.map(user => user.fcmToken);

    const message = {
      notification: {
        title,
        body,
      },
      tokens: fcmTokens,
    };

    const response = await admin
      .messaging()
      .sendEachForMulticast(message as any);

    const successIndices = response.responses
      .map((res: any, idx: number) => (res.success ? idx : null))
      .filter((_, idx: number) => idx !== null) as number[];

    const successfulUsers = successIndices.map(idx => users[idx]);

    const notificationData = successfulUsers.map(user => ({
      receiverId: user.id,
      senderId: req.user.id,
      title,
      body,
    }));

    await prisma.notification.createMany({
      data: notificationData,
    });

    const failedTokens = response.responses
      .map((res: any, idx: number) => (!res.success ? fcmTokens[idx] : null))
      .filter((token): token is string => token !== null);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || 'Failed to send notifications');
  }
};

// Fetch notifications for the current user
// Fetch notifications for the current user
const getNotificationsFromDB = async (req: any) => {
  try {
    const userId = req.user.id;

    // Validate user ID
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    // Fetch notifications for the current user
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check if notifications exist

    // Return formatted notifications
    return notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      sender: {
        id: notification.sender.id,
       
      },
    }));
  } catch (error: any) {
    throw new ApiError(500, error.message || 'Failed to fetch notifications');
  }
};

// Fetch a single notification and mark it as read
const getSingleNotificationFromDB = async (
  req: any,
  notificationId: string,
) => {
  try {
    const userId = req.user.id;

    // Validate user and notification ID
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    if (!notificationId) {
      throw new ApiError(400, 'Notification ID is required');
    }

    // Fetch the notification
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,

          },
        },
      },
    });

    // Mark the notification as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
   
          },
        },
      },
    });

    // Return the updated notification
    return {
      id: updatedNotification.id,
      title: updatedNotification.title,
      body: updatedNotification.body,
      isRead: updatedNotification.isRead,
      createdAt: updatedNotification.createdAt,
      sender: {
        id: updatedNotification.sender.id,
        email: updatedNotification.sender.email,
     
      },
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || 'Failed to fetch notification');
  }
};

// ── Scheduled broadcasts ───────────────────────────────────────────
//
// Admins compose a notification on the dashboard and schedule it for
// a future moment ("Friday 7pm — tonight at Mesa"). The row sits as
// PENDING until the worker (runDueScheduled, fired every 60s from
// server startup) finds it and fans it out via the same code path the
// immediate broadcast uses. Cancellable up until the worker grabs it.

const scheduleBroadcast = async (req: any) => {
  const { title, body, scheduledFor } = req.body || {};
  if (!title?.trim() || !body?.trim()) {
    throw new ApiError(400, "Title and body are required");
  }
  const when = scheduledFor ? new Date(scheduledFor) : null;
  if (!when || isNaN(when.getTime())) {
    throw new ApiError(400, "scheduledFor must be a valid ISO timestamp");
  }
  if (when.getTime() < Date.now() - 30_000) {
    // 30s grace for clock skew; otherwise reject past-dated schedules
    // so editors don't fire something at "yesterday" by accident.
    throw new ApiError(400, "scheduledFor must be in the future");
  }
  return prisma.scheduledNotification.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      scheduledFor: when,
      createdById: req.user.id,
    },
  });
};

const listScheduled = async () => {
  return prisma.scheduledNotification.findMany({
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });
};

const cancelScheduled = async (req: any) => {
  const { id } = req.params;
  const existing = await prisma.scheduledNotification.findUnique({
    where: { id },
  });
  if (!existing) throw new ApiError(404, "Scheduled notification not found");
  if (existing.status !== "PENDING") {
    throw new ApiError(400, `Cannot cancel — already ${existing.status}`);
  }
  return prisma.scheduledNotification.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
};

// Worker tick — called every 60s from server.ts. Picks up any PENDING
// rows whose scheduledFor has arrived, fires the multicast, records
// the outcome. Wrapped in try/catch per row so one bad notification
// doesn't kill the whole batch.
const runDueScheduled = async () => {
  const now = new Date();
  const due = await prisma.scheduledNotification.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    take: 20,
  });
  for (const row of due) {
    try {
      const users = await prisma.user.findMany({
        where: { fcmToken: { not: null } },
        select: { id: true, fcmToken: true },
      });
      if (!users.length) {
        await prisma.scheduledNotification.update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            errorMessage: "No users with FCM tokens",
            sentAt: new Date(),
          },
        });
        continue;
      }
      const fcmTokens = users.map((u) => u.fcmToken);
      const response = await admin
        .messaging()
        .sendEachForMulticast({
          notification: { title: row.title, body: row.body },
          tokens: fcmTokens,
        } as any);

      const successIndices = response.responses
        .map((res: any, idx: number) => (res.success ? idx : null))
        .filter((idx): idx is number => idx !== null);
      const successfulUsers = successIndices.map((idx) => users[idx]);
      const notificationData = successfulUsers.map((u) => ({
        receiverId: u.id,
        senderId: row.createdById,
        title: row.title,
        body: row.body,
      }));
      if (notificationData.length) {
        await prisma.notification.createMany({ data: notificationData });
      }
      await prisma.scheduledNotification.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          successCount: response.successCount,
          failureCount: response.failureCount,
        },
      });
    } catch (err: any) {
      await prisma.scheduledNotification.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          sentAt: new Date(),
          errorMessage: err?.message?.slice(0, 500) || "Unknown error",
        },
      });
    }
  }
};

export const notificationServices = {
  sendSingleNotification,
  sendNotifications,
  getNotificationsFromDB,
  getSingleNotificationFromDB,
  scheduleBroadcast,
  listScheduled,
  cancelScheduled,
  runDueScheduled,
};
