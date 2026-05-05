/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import prisma from "../../../shared/prisma";

/// Append Pink Pineapple attribution params to a destination URL so the
/// venue can see "pinkpineapple" in their own analytics. The pp_click_id
/// is what we use to correlate this click with a confirmed booking later
/// (when native API integration arrives).
const appendAttribution = (
  rawUrl: string,
  clickId: string,
  source: string
): string => {
  if (!rawUrl) return rawUrl;
  // Don't touch tel:/sms:/whatsapp:/instagram: schemes — they don't take query params
  if (/^(tel|sms|mailto|whatsapp|instagram):/i.test(rawUrl)) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "pinkpineapple");
    u.searchParams.set("utm_medium", source.toLowerCase());
    u.searchParams.set("utm_campaign", "venue_book");
    u.searchParams.set("pp_click_id", clickId);
    return u.toString();
  } catch {
    // Not a parseable URL — return as-is
    return rawUrl;
  }
};

/// POST /venues/:id/booking-click
/// Body: { source?: "MOBILE_APP" | "DASHBOARD" | "WEB", deviceId?: string, dayKey?: string }
/// Returns: { clickId, redirectUrl, provider }
const recordClick = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const venueId = req.params.id;
  const source = String(req.body?.source || "MOBILE_APP").toUpperCase();
  const deviceId = String(req.body?.deviceId || "");
  const dayKey = String(req.body?.dayKey || "").toLowerCase();

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      bookingUrl: true,
      bookingProvider: true,
      bookingPhone: true,
      bookingWhatsapp: true,
      bookingInstagram: true,
      bookingDailyUrls: true,
    },
  });

  if (!venue) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Venue not found",
      data: null,
    });
  }

  // Pick the right URL/contact based on provider + day-of-week routing.
  // Daily URLs (Mesa-style) take precedence when a matching dayKey is supplied.
  let destinationUrl = venue.bookingUrl || "";
  const provider = venue.bookingProvider || "CUSTOM_WEB";

  const dailyUrls = venue.bookingDailyUrls as Record<string, string> | null;
  if (dayKey && dailyUrls && typeof dailyUrls[dayKey] === "string" && dailyUrls[dayKey]) {
    destinationUrl = dailyUrls[dayKey];
  }

  if (provider === "PHONE" && venue.bookingPhone) {
    destinationUrl = `tel:${venue.bookingPhone.replace(/\s+/g, "")}`;
  } else if (provider === "WHATSAPP" && venue.bookingWhatsapp) {
    const num = venue.bookingWhatsapp.replace(/\D/g, "");
    destinationUrl = `https://wa.me/${num}`;
  } else if (provider === "INSTAGRAM_DM" && venue.bookingInstagram) {
    const handle = venue.bookingInstagram.replace(/^@/, "");
    destinationUrl = `https://ig.me/m/${handle}`;
  }

  // Create the click row first so we have an id to embed in the URL.
  const click = await prisma.venueBookingClick.create({
    data: {
      venueId: venue.id,
      userId: req.user?.id,
      source,
      provider: String(provider),
      deviceId,
      redirectUrl: "", // filled in below after attribution
    },
  });

  const finalUrl = appendAttribution(destinationUrl, click.id, source);

  // Update with the final URL so we have a record of exactly what we sent.
  await prisma.venueBookingClick.update({
    where: { id: click.id },
    data: { redirectUrl: finalUrl },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Click recorded",
    data: {
      clickId: click.id,
      redirectUrl: finalUrl,
      provider,
    },
  });
});

/// GET /venues/:id/booking-clicks?windowDays=30
/// Returns aggregated click counts for one venue.
const getStats = catchAsync(async (req: Request, res: Response) => {
  const venueId = req.params.id;
  const windowDays = Math.min(
    365,
    Math.max(1, parseInt(String(req.query.windowDays || "30"), 10) || 30)
  );
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [total, recent, lastClick] = await Promise.all([
    prisma.venueBookingClick.count({ where: { venueId } }),
    prisma.venueBookingClick.count({
      where: { venueId, createdAt: { gte: cutoff } },
    }),
    prisma.venueBookingClick.findFirst({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, source: true, provider: true },
    }),
  ]);

  // Per-day breakdown for the window — useful for a sparkline in the dashboard.
  const recentRows = await prisma.venueBookingClick.findMany({
    where: { venueId, createdAt: { gte: cutoff } },
    select: { createdAt: true, source: true, provider: true },
    orderBy: { createdAt: "desc" },
  });
  const byDay: Record<string, number> = {};
  for (const r of recentRows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking click stats",
    data: {
      total,
      windowDays,
      recent,
      lastClick,
      byDay,
    },
  });
});

/// GET /venues/booking-clicks/overview?windowDays=30
/// Aggregated booking click stats across the caller's owned venues
/// (or all venues if admin). Powers the dashboard /analytics page.
const getOverview = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Auth required",
      data: null,
    });
  }

  const windowDays = Math.min(
    365,
    Math.max(1, parseInt(String(req.query.windowDays || "30"), 10) || 30)
  );
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Scope: ADMINs see everything; CLUB users see only the venues they own.
  const venueScope =
    role === "ADMIN" ? {} : { ownerId: userId };

  const venues = await prisma.venue.findMany({
    where: venueScope,
    select: { id: true, name: true, slug: true, area: true, category: true, bookingProvider: true },
  });
  const venueIds = venues.map((v) => v.id);

  if (venueIds.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "No venues in scope",
      data: {
        totals: { allTime: 0, recent: 0, withinWindow: windowDays },
        byDay: {},
        byProvider: {},
        topVenues: [],
        venueCount: 0,
      },
    });
  }

  // Run the aggregations in parallel for speed
  const [allTimeTotal, recentRows, recentTotal] = await Promise.all([
    prisma.venueBookingClick.count({ where: { venueId: { in: venueIds } } }),
    prisma.venueBookingClick.findMany({
      where: { venueId: { in: venueIds }, createdAt: { gte: cutoff } },
      select: { venueId: true, provider: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.venueBookingClick.count({
      where: { venueId: { in: venueIds }, createdAt: { gte: cutoff } },
    }),
  ]);

  // byDay sparkline
  const byDay: Record<string, number> = {};
  for (const r of recentRows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  // Provider mix in the window
  const byProvider: Record<string, number> = {};
  for (const r of recentRows) {
    const p = r.provider || "UNKNOWN";
    byProvider[p] = (byProvider[p] || 0) + 1;
  }

  // Top venues in the window — count + venue meta for the leaderboard
  const venueMeta = new Map(venues.map((v) => [v.id, v]));
  const venueCounts: Record<string, number> = {};
  for (const r of recentRows) {
    venueCounts[r.venueId] = (venueCounts[r.venueId] || 0) + 1;
  }
  const topVenues = Object.entries(venueCounts)
    .map(([id, count]) => {
      const v = venueMeta.get(id);
      return v
        ? {
            id,
            name: v.name,
            slug: v.slug,
            area: v.area,
            category: v.category,
            provider: v.bookingProvider || null,
            clicks: count,
          }
        : null;
    })
    .filter((x) => x !== null)
    .sort((a: any, b: any) => b.clicks - a.clicks)
    .slice(0, 10);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking click overview",
    data: {
      totals: {
        allTime: allTimeTotal,
        recent: recentTotal,
        withinWindow: windowDays,
      },
      byDay,
      byProvider,
      topVenues,
      venueCount: venues.length,
    },
  });
});

export const BookingClickController = {
  recordClick,
  getStats,
  getOverview,
};
