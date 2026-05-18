import express from "express";
import auth from "../../middlewares/auth";
import { VipBookingController } from "./VipBooking.controller";

const router = express.Router();

// User creates a VIP table request from the Flutter app. Returns a
// reference code the app embeds in the WhatsApp message so Rowan can
// match the thread to a database row.
router.post("/", auth(), VipBookingController.createRequest);

// User has actually tapped through to WhatsApp — record the timestamp.
router.post(
  "/:id/whatsapp-opened",
  auth(),
  VipBookingController.markWhatsappOpened
);

// User's own request history (for a future "My VIP Requests" tab)
router.get("/mine", auth(), VipBookingController.listMyRequests);

// Admin / promoter dashboard — list all requests, filter by status
router.get("/", auth("ADMIN"), VipBookingController.listAllRequests);

// Admin / promoter dashboard — fetch one request for the detail view
router.get("/:id", auth("ADMIN"), VipBookingController.getRequestById);

// Admin / promoter dashboard — update workflow state, attach payment URL
router.patch("/:id", auth("ADMIN"), VipBookingController.updateRequest);

export const VipBookingRoutes = router;
