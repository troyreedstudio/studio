import { Request } from "express";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { VipBookingStatus, VipDepositChoice } from "@prisma/client";

interface CreateVipBookingPayload {
  venueId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  instagram?: string;
  eventDate: string; // ISO date or YYYY-MM-DD
  arrivalTime: string; // "23:00"
  partySize: number;
  requestedArea: string;
  minimumPrice: string;
  depositChoice: VipDepositChoice;
}

const createRequest = async (req: Request & { user?: any }) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const payload = req.body as CreateVipBookingPayload;

  // Required-field guard. Flutter validates these too, but never trust the
  // client for revenue-attribution data.
  const required: (keyof CreateVipBookingPayload)[] = [
    "venueId",
    "firstName",
    "lastName",
    "phone",
    "email",
    "eventDate",
    "arrivalTime",
    "partySize",
    "requestedArea",
    "minimumPrice",
  ];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Missing required field: ${field}`
      );
    }
  }

  // Verify the venue exists so we don't accept orphan requests
  const venue = await prisma.venue.findUnique({
    where: { id: payload.venueId },
    select: { id: true, name: true },
  });
  if (!venue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Venue not found");
  }

  const eventDate = new Date(payload.eventDate);
  if (isNaN(eventDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event date");
  }

  const created = await prisma.vipBookingRequest.create({
    data: {
      userId,
      venueId: payload.venueId,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim().toLowerCase(),
      instagram: (payload.instagram || "").trim(),
      eventDate,
      arrivalTime: payload.arrivalTime.trim(),
      partySize: payload.partySize,
      requestedArea: payload.requestedArea.trim(),
      minimumPrice: payload.minimumPrice.trim(),
      depositChoice: payload.depositChoice || VipDepositChoice.FIFTY_PERCENT,
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
    },
  });

  return {
    id: created.id,
    status: created.status,
    createdAt: created.createdAt,
    // Short reference code Rowan can use to match the WhatsApp thread to
    // this DB record. First 8 chars of the ObjectId, uppercased.
    reference: `PP-${created.id.slice(-8).toUpperCase()}`,
  };
};

const markWhatsappOpened = async (
  req: Request & { user?: any },
  id: string
) => {
  const userId = req.user?.id;
  const record = await prisma.vipBookingRequest.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, "Request not found");
  }
  if (record.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not your request");
  }
  await prisma.vipBookingRequest.update({
    where: { id },
    data: { whatsappOpenedAt: new Date() },
  });
  return { ok: true };
};

const listMyRequests = async (req: Request & { user?: any }) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return prisma.vipBookingRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      venue: { select: { id: true, name: true, slug: true } },
    },
  });
};

// Admin/promoter dashboard: list all requests, filterable by status.
const listAllRequests = async (req: Request & { user?: any }) => {
  const status = req.query.status as VipBookingStatus | undefined;
  return prisma.vipBookingRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      venue: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
  });
};

// Admin/promoter dashboard: fetch one request by id (detail view).
const getRequestById = async (id: string) => {
  const record = await prisma.vipBookingRequest.findUnique({
    where: { id },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          slug: true,
          floorPlanUrl: true,
          category: true,
          area: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          instagram: true,
        },
      },
    },
  });
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, "VIP request not found");
  }
  return record;
};

// Admin/promoter dashboard: update the workflow state of a request.
// Records timestamps automatically as the status transitions.
const updateRequest = async (req: Request, id: string) => {
  const allowed = ["status", "paymentUrl", "internalNotes"];
  const data: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }

  if (data.status === VipBookingStatus.SENT_TO_VENUE && !data.sentToVenueAt) {
    data.sentToVenueAt = new Date();
  }
  if (data.status === VipBookingStatus.CONFIRMED && !data.confirmedAt) {
    data.confirmedAt = new Date();
  }
  if (data.status === VipBookingStatus.PAID && !data.paidAt) {
    data.paidAt = new Date();
  }
  if (data.status === VipBookingStatus.CANCELLED && !data.cancelledAt) {
    data.cancelledAt = new Date();
  }

  return prisma.vipBookingRequest.update({
    where: { id },
    data,
  });
};

export const VipBookingService = {
  createRequest,
  markWhatsappOpened,
  listMyRequests,
  listAllRequests,
  getRequestById,
  updateRequest,
};
