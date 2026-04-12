import Stripe from "stripe";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import config from "../../../config";
import { BookingStatus } from "@prisma/client";

const stripe = new Stripe(config.stripe_key as string, {
  apiVersion: "2024-06-20" as any,
});

const createCheckoutSession = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: { select: { eventName: true } },
      ticket: {
        include: { ticketCharges: true },
      },
      table: {
        include: { tableCharges: true },
      },
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only pay for your own bookings"
    );
  }

  if (booking.status === BookingStatus.ACCEPTED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Booking is already paid");
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  // Build line items from ticket or table charges
  if (booking.bookingType === "TICKET" && booking.ticket) {
    for (const charge of booking.ticket.ticketCharges) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${booking.event.eventName} - ${charge.feeName}`,
          },
          unit_amount: Math.round(parseFloat(charge.feeAmount) * 100),
        },
        quantity: booking.guest || 1,
      });
    }
  }

  if (booking.bookingType === "TABLE" && booking.table) {
    for (const charge of booking.table.tableCharges) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${booking.event.eventName} - ${charge.feeName}`,
          },
          unit_amount: Math.round(parseFloat(charge.feeAmount) * 100),
        },
        quantity: 1,
      });
    }
  }

  // Fallback: if no line items from charges, use paidAmount
  if (lineItems.length === 0 && booking.paidAmount > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${booking.event.eventName} - Booking`,
        },
        unit_amount: booking.paidAmount * 100,
      },
      quantity: 1,
    });
  }

  if (lineItems.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No charges found for this booking"
    );
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${config.stripe_success_url || "https://pinkpineapple.app/booking/success"}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe_cancel_url || "https://pinkpineapple.app/booking/cancel"}`,
    metadata: {
      bookingId: booking.id,
      userId,
    },
  });

  return { sessionId: session.id, url: session.url };
};

const handleWebhook = async (payload: Buffer, sig: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      config.stripe_webhook_secret as string
    );
  } catch (err: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${err.message}`
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const amountPaid = session.amount_total
        ? Math.round(session.amount_total / 100)
        : 0;

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ACCEPTED,
          paidAmount: amountPaid,
        },
      });
    }
  }

  return { received: true };
};

const getPaymentByBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      paidAmount: true,
      bookingType: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      event: {
        select: {
          id: true,
          eventName: true,
        },
      },
    },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only view your own payment status"
    );
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    paidAmount: booking.paidAmount,
    bookingType: booking.bookingType,
    event: booking.event,
    isPaid: booking.status === BookingStatus.ACCEPTED,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};

export const paymentService = {
  createCheckoutSession,
  handleWebhook,
  getPaymentByBooking,
};
