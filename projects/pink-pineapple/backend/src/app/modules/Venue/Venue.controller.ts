import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { venueService } from "./Venue.service";
import { venueFilterableFields } from "./Venue.interface";
import pick from "../../../shared/pick";

const createVenue = catchAsync(async (req, res) => {
  const result = await venueService.createIntoDb(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Venue created successfully",
    data: result,
  });
});

const getVenueList = catchAsync(async (req, res) => {
  const filters = pick(req.query, venueFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const userId = req.user?.id || "";
  const result = await venueService.getListFromDb(
    filters as any,
    options,
    userId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venue list retrieved successfully",
    data: result,
  });
});

const getByArea = catchAsync(async (req, res) => {
  const userId = req.user?.id || "";
  const result = await venueService.getByArea(req.params.area, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venues by area retrieved successfully",
    data: result,
  });
});

const getFeatured = catchAsync(async (req, res) => {
  const userId = req.user?.id || "";
  const result = await venueService.getFeatured(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Featured venues retrieved successfully",
    data: result,
  });
});

const searchVenues = catchAsync(async (req, res) => {
  const searchTerm = (req.query.searchTerm as string) || "";
  const userId = req.user?.id || "";
  const result = await venueService.searchVenues(searchTerm, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Search results retrieved successfully",
    data: result,
  });
});

const getVenueById = catchAsync(async (req, res) => {
  const userId = req.user?.id || "";
  const result = await venueService.getByIdFromDb(req.params.id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venue details retrieved successfully",
    data: result,
  });
});

const updateVenue = catchAsync(async (req, res) => {
  const result = await venueService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venue updated successfully",
    data: result,
  });
});

const deleteVenue = catchAsync(async (req, res) => {
  const result = await venueService.deleteFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Venue deleted successfully",
    data: result,
  });
});

const toggleFavorite = catchAsync(async (req, res) => {
  const result = await venueService.toggleFavorite(
    req.params.id,
    req.user.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const VenueController = {
  createVenue,
  getVenueList,
  getByArea,
  getFeatured,
  searchVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  toggleFavorite,
};
