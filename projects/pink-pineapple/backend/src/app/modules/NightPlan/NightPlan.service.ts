import { Request } from "express";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { NightPlanStatus } from "@prisma/client";

// Shape of a single stop in the saved itinerary. Stored as JSON so the
// schema can evolve without a migration each time we add a field.
interface PlanStop {
  venueId: string;
  role: string; // "dinner" | "drinks" | "dance" | "after-hours" | etc.
  startTime: string; // "20:00"
  endTime: string; // "22:00"
  booked?: boolean;
  bookedAt?: string | null;
  walkingMinutesFromPrev?: number | null;
}

interface CreatePlanPayload {
  vibe: string;
  eventDate: string;
  stops: PlanStop[];
}

const requireUser = (req: Request & { user?: any }) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return userId as string;
};

const create = async (req: Request & { user?: any }) => {
  const userId = requireUser(req);
  const payload = req.body as CreatePlanPayload;

  if (!payload.vibe || !payload.vibe.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Vibe is required");
  }
  if (!payload.eventDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event date is required");
  }
  if (!Array.isArray(payload.stops) || payload.stops.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Plan must include at least one stop"
    );
  }

  const eventDate = new Date(payload.eventDate);
  if (isNaN(eventDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event date");
  }

  // Normalise stop shape so we control what's persisted, not whatever
  // garbage the client sends.
  const stops: PlanStop[] = payload.stops.map((s) => ({
    venueId: String(s.venueId || ""),
    role: String(s.role || "").trim(),
    startTime: String(s.startTime || ""),
    endTime: String(s.endTime || ""),
    booked: Boolean(s.booked),
    bookedAt: s.bookedAt || null,
    walkingMinutesFromPrev:
      typeof s.walkingMinutesFromPrev === "number"
        ? s.walkingMinutesFromPrev
        : null,
  }));

  return prisma.nightPlan.create({
    data: {
      userId,
      vibe: payload.vibe.trim(),
      eventDate,
      stops: stops as any,
    },
  });
};

// Returns the user's plans, most-recent first. Past plans are flipped to
// COMPLETED on read so the My Bookings banner can show ACTIVE-only.
const listMine = async (req: Request & { user?: any }) => {
  const userId = requireUser(req);
  const all = await prisma.nightPlan.findMany({
    where: { userId },
    orderBy: { eventDate: "desc" },
  });

  // Lazy archive: anything whose eventDate is yesterday or earlier and
  // still marked ACTIVE flips to COMPLETED. Done here instead of a cron
  // job so we don't need extra infra for v1.3.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toArchive = all.filter(
    (p) => p.status === NightPlanStatus.ACTIVE && p.eventDate < today
  );
  if (toArchive.length > 0) {
    await prisma.nightPlan.updateMany({
      where: { id: { in: toArchive.map((p) => p.id) } },
      data: { status: NightPlanStatus.COMPLETED },
    });
    for (const p of toArchive) p.status = NightPlanStatus.COMPLETED;
  }
  return all;
};

// Single plan for the detail view. Owner-only — admin/promoters don't
// need a way in here.
const getById = async (req: Request & { user?: any }, id: string) => {
  const userId = requireUser(req);
  const plan = await prisma.nightPlan.findUnique({ where: { id } });
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }
  if (plan.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not your plan");
  }
  return plan;
};

// Whole-plan update — most commonly used to toggle a stop's `booked`
// flag when the user actually commits to a venue. The client sends
// the whole stops array back; we replace.
const update = async (req: Request & { user?: any }, id: string) => {
  const userId = requireUser(req);
  const existing = await prisma.nightPlan.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }
  if (existing.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not your plan");
  }

  const data: any = {};
  if (req.body.vibe !== undefined) data.vibe = String(req.body.vibe).trim();
  if (req.body.eventDate !== undefined) {
    const d = new Date(req.body.eventDate);
    if (isNaN(d.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event date");
    }
    data.eventDate = d;
  }
  if (req.body.status !== undefined) {
    if (!Object.values(NightPlanStatus).includes(req.body.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status");
    }
    data.status = req.body.status;
  }
  if (Array.isArray(req.body.stops)) {
    data.stops = req.body.stops.map((s: PlanStop) => ({
      venueId: String(s.venueId || ""),
      role: String(s.role || "").trim(),
      startTime: String(s.startTime || ""),
      endTime: String(s.endTime || ""),
      booked: Boolean(s.booked),
      bookedAt: s.bookedAt || null,
      walkingMinutesFromPrev:
        typeof s.walkingMinutesFromPrev === "number"
          ? s.walkingMinutesFromPrev
          : null,
    }));
  }

  return prisma.nightPlan.update({ where: { id }, data });
};

const remove = async (req: Request & { user?: any }, id: string) => {
  const userId = requireUser(req);
  const existing = await prisma.nightPlan.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }
  if (existing.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not your plan");
  }
  await prisma.nightPlan.delete({ where: { id } });
  return { ok: true };
};

export const NightPlanService = {
  create,
  listMine,
  getById,
  update,
  remove,
};
