;
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { notificationServices } from "./Notification.service";


const sendNotification = catchAsync(async (req: any, res: any) => {
  const notification = await notificationServices.sendSingleNotification(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notification sent successfully",
    data: notification,
  });
});

const sendNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.sendNotifications(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "notifications sent successfully",
    data: notifications,
  });
});

const getNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.getNotificationsFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: notifications,
  });
});

const getSingleNotificationById = catchAsync(async (req: any, res: any) => {
  const notificationId = req.params.notificationId;
  const notification = await notificationServices.getSingleNotificationFromDB(
    req,
    notificationId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Notification retrieved successfully",
    data: notification,
  });
});

// Schedule a broadcast for the future. Body: { title, body, scheduledFor (ISO) }
const scheduleBroadcast = catchAsync(async (req: any, res: any) => {
  const row = await notificationServices.scheduleBroadcast(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Broadcast scheduled",
    data: row,
  });
});

// List recent scheduled broadcasts (pending + sent + failed). Used by
// the Send Notification page's audit table.
const listScheduled = catchAsync(async (_req: any, res: any) => {
  const rows = await notificationServices.listScheduled();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scheduled notifications retrieved",
    data: rows,
  });
});

// Cancel a PENDING scheduled broadcast before the worker picks it up.
const cancelScheduled = catchAsync(async (req: any, res: any) => {
  const row = await notificationServices.cancelScheduled(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scheduled notification cancelled",
    data: row,
  });
});

export const notificationController = {
  sendNotification,
  sendNotifications,
  getNotifications,
  getSingleNotificationById,
  scheduleBroadcast,
  listScheduled,
  cancelScheduled,
};
