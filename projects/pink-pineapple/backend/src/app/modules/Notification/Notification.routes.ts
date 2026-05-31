import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { notificationController } from "./Notification.controller";

const router = express.Router();

// Targeted send (admin → specific user). Future admin tooling for
// one-to-one nudges. Locked behind admin so a malicious user can't
// impersonate the platform to a specific person.
router.post(
  "/send-notification/:userId",
  auth(UserRole.ADMIN),
  notificationController.sendNotification
);

// Broadcast (admin → every user with a registered FCM token). Powers
// the "Send Notification" page on the dashboard. /broadcast is the
// canonical path the dashboard uses; /send-notification is kept as
// an alias so we don't break any in-flight tooling.
router.post(
  "/send-notification",
  auth(UserRole.ADMIN),
  notificationController.sendNotifications
);
router.post(
  "/broadcast",
  auth(UserRole.ADMIN),
  notificationController.sendNotifications
);

router.get("/", auth(), notificationController.getNotifications);
router.get(
  "/:notificationId",
  auth(),
  notificationController.getSingleNotificationById
);

export const notificationsRoute = router;
