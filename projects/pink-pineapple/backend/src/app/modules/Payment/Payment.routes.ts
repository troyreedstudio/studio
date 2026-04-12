import express from "express";
import auth from "../../middlewares/auth";
import { PaymentController } from "./Payment.controller";

const router = express.Router();

router.post("/checkout", auth(), PaymentController.createCheckout);

// Stripe webhook — NO auth, raw body handled in app.ts
router.post("/webhook", PaymentController.webhook);

router.get("/status/:bookingId", auth(), PaymentController.getStatus);

export const PaymentRoutes = router;
