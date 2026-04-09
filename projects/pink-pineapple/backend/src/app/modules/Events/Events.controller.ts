import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { eventsService } from "./Events.service";
import { eventFilterableFields } from "./Events.interface";
import pick from "../../../shared/pick";

const createEvents = catchAsync(async (req, res) => {
  const result = await eventsService.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Events created successfully",
    data: result,
  });
});

const getEventsList = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])
  const userId=req.user.id;
  const result = await eventsService.getListFromDb(filters,options,userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events list retrieved successfully",
    data: result,
  });
});
const getPublicEventsList = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])
  const result = await eventsService.getListFromDb(filters, options, '');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events list retrieved successfully",
    data: result,
  });
});
const myEvent = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])
  const userId=req.user.id;
  const result = await eventsService.myEvent(filters,options,userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events list retrieved successfully",
    data: result,
  });
});

const getEventsById = catchAsync(async (req, res) => {
  const result = await eventsService.getByIdFromDb(req.params.id,req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events details retrieved successfully",
    data: result,
  });
});
const tonightEvent = catchAsync(async (req, res) => {
  const result = await eventsService.tonightEvent();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "tonight Events details retrieved successfully",
    data: result,
  });
});

const updateEvents = catchAsync(async (req, res) => {
  const result = await eventsService.updateIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events updated successfully",
    data: result,
  });
});
const updateEventTicket = catchAsync(async (req, res) => {
  const result = await eventsService.updateEventTicket(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: " update Event Ticket successfully",
    data: result,
  });
});
const updateTicketCharges = catchAsync(async (req, res) => {
  const result = await eventsService.updateTicketCharges(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "update Ticket Charges successfully",
    data: result,
  });
});
const updateEventTable = catchAsync(async (req, res) => {
  const result = await eventsService.updateEventTable(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "update EventTable successfully",
    data: result,
  });
});
const updateTableCharges = catchAsync(async (req, res) => {
  const result = await eventsService.updateTableCharges(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "update Table Charges successfully",
    data: result,
  });
});
const updataStatus = catchAsync(async (req, res) => {
  const result = await eventsService.updataStatus(req.params.id,req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "update Table Charges successfully",
    data: result,
  });
});

const deleteEvents = catchAsync(async (req, res) => {
  const result = await eventsService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events deleted successfully",
    data: result,
  });
});

export const EventsController = {
  createEvents,
  getEventsList,
  getPublicEventsList,
  getEventsById,
  updateEvents,
  deleteEvents,
  tonightEvent,
  updateEventTicket,
  updateTicketCharges,
  updateEventTable,
  updateTableCharges,
  updataStatus,
  myEvent
};
