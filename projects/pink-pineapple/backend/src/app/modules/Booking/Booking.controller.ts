import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { bookingService } from "./Booking.service";
import pick from "../../../shared/pick";

const createBooking = catchAsync(async (req, res) => {
  // console.log(req.body);
  const result = await bookingService.createIntoDb(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});

const getBookingList = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const filters = pick(req.query, ['status', 'searchTerm', 'eventName']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  // Pass the filters, pagination options, and userId to get the list of bookings
  const result = await bookingService.getListFromDb(filters, options, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking list retrieved successfully",
    data: result,
  });
});

const getMyBooking = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await bookingService.getMyBooking(userId,  req.query?.status ? req.query?.status : (undefined as any));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My Booking list retrieved successfully",
    data: result,
  });
});

const getBookingById = catchAsync(async (req, res) => {
  const result = await bookingService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking details retrieved successfully",
    data: result,
  });
});

const updateBooking = catchAsync(async (req, res) => {
  const result = await bookingService.updateIntoDb(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking updated successfully",
    data: result,
  });
});

const deleteBooking = catchAsync(async (req, res) => {
  const result = await bookingService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking deleted successfully",
    data: result,
  });
});
const updateStatus = catchAsync(async (req, res) => {
  const result = await bookingService.updateStatus(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking deleted successfully",
    data: result,
  });
});

export const BookingController = {
  createBooking,
  getBookingList,
  getBookingById,
  updateBooking,
  deleteBooking,
  getMyBooking,
  updateStatus,
};
