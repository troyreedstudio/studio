import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { paymentService } from "./Payment.service";
import { Request, Response } from "express";

const createCheckout = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const result = await paymentService.createCheckoutSession(
    bookingId,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

const webhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const result = await paymentService.handleWebhook(req.body, sig);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

const getStatus = catchAsync(async (req, res) => {
  const result = await paymentService.getPaymentByBooking(
    req.params.bookingId,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment status retrieved successfully",
    data: result,
  });
});

export const PaymentController = {
  createCheckout,
  webhook,
  getStatus,
};
