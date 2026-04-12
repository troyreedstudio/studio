import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { venueFavoriteService } from "./VenueFavorite.service";

const toggleFavorite = catchAsync(async (req, res) => {
  const result = await venueFavoriteService.toggleFavorite(
    req.params.venueId,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getUserFavorites = catchAsync(async (req, res) => {
  const result = await venueFavoriteService.getUserFavorites(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venue favorites retrieved successfully",
    data: result,
  });
});

export const VenueFavoriteController = {
  toggleFavorite,
  getUserFavorites,
};
