import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { EventsController } from "./Events.controller";
import { EventsValidation } from "./Events.validation";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

router.post(
  "/",
  auth(),
  // validateRequest(EventsValidation.createSchema),
  fileUploader.event,
  EventsController.createEvents
);

router.get("/public", EventsController.getPublicEventsList);
router.get("/", auth(), EventsController.getEventsList);
router.get("/tonight", auth(), EventsController.tonightEvent);
router.get("/my-event", auth(), EventsController.myEvent);

router.get("/:id", auth(), EventsController.getEventsById);

router.put("/:id", auth(), fileUploader.event, EventsController.updateEvents);
router.put(
  "/event-table/:id",
  auth(),
  fileUploader.event,
  EventsController.updateEventTable
);
router.put(
  "/table-charges/:id",
  auth(),
  EventsController.updataStatus
);
router.put(
  "/update-status/:id",
  auth(),
  EventsController.updataStatus
);
router.put("/event-ticket/:id", auth(), EventsController.updateEventTicket);
router.put(
  "/update-event-ticket-charges/:id",
  auth(),
  EventsController.updateTicketCharges
);

router.delete("/:id", auth(), EventsController.deleteEvents);

export const EventsRoutes = router;
