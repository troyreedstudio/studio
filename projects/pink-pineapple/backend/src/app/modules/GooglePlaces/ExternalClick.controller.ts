import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import prisma from "../../../shared/prisma";

/// Logs a click on a Google Places result that the user was redirected
/// out to. Pairs with the home search's "MORE IN BALI" results.
const recordExternalClick = catchAsync(async (req: Request, res: Response) => {
  const { placeId, placeName, placeAddress, redirectUrl } = req.body || {};
  const userId = (req as any).user?.id ?? null;

  if (!placeId) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "placeId is required",
      data: null,
    });
  }

  const click = await prisma.externalPlaceClick.create({
    data: {
      placeId: String(placeId),
      placeName: placeName ? String(placeName) : "",
      placeAddress: placeAddress ? String(placeAddress) : "",
      redirectUrl: redirectUrl ? String(redirectUrl) : "",
      source: "GOOGLE",
      userId,
    },
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "External click logged",
    data: { id: click.id },
  });
});

export const ExternalClickController = { recordExternalClick };
