import express from "express";
import auth from "../../middlewares/auth";
import { VenueController } from "./Venue.controller";
import validateRequest from "../../middlewares/validateRequest";
import { VenueValidation } from "./Venue.validation";
import { optionalAuth } from "./Venue.optionalAuth";
import { fileUploader } from "../../../helpers/fileUploader";
import { BookingClickController } from "./BookingClick.controller";

const router = express.Router();

// Parse a `data` JSON string field into req.body before validation.
// Used on routes that accept multipart/form-data so the venue fields
// can travel as a single JSON blob alongside file uploads.
const parseVenueDataJson = (req: any, _res: any, next: any) => {
  try {
    if (req.body && typeof req.body.data === "string") {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...parsed, ...req.files ? {} : {} };
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Public routes (browse-first, sign-up-at-booking)
router.get("/", optionalAuth, VenueController.getVenueList);
router.get("/featured", optionalAuth, VenueController.getFeatured);
router.get("/area/:area", optionalAuth, VenueController.getByArea);
router.get("/search", optionalAuth, VenueController.searchVenues);
router.get("/whats-on", optionalAuth, VenueController.getWhatsOn);
router.get("/whats-on/:day", optionalAuth, VenueController.getWhatsOn);
router.get("/ratable", auth(), VenueController.getRatableBookings);
router.get("/tonight-vibe", auth(), VenueController.getTonightVibeBookings);
router.get("/favorites", auth(), VenueController.getFavoriteVenues);
router.get("/owned", auth("ADMIN", "CLUB"), VenueController.getOwnedVenues);
router.get("/:id/stats", auth("ADMIN", "CLUB"), VenueController.getVenueOwnerStats);
router.get("/:id", optionalAuth, VenueController.getVenueById);

// Protected routes
// Both create + update accept multipart/form-data with up to 1 heroImage
// and 15 photos, plus a `data` JSON string with the rest of the fields.
// They also still accept plain application/json bodies for clients that
// don't send files (the dashboard's edit form, for example).
router.post(
  "/",
  auth("ADMIN", "CLUB"),
  fileUploader.venue,
  parseVenueDataJson,
  validateRequest(VenueValidation.createSchema),
  VenueController.createVenue
);

router.put(
  "/:id",
  auth("ADMIN", "CLUB"),
  fileUploader.venue,
  parseVenueDataJson,
  validateRequest(VenueValidation.updateSchema),
  VenueController.updateVenue
);

router.delete("/:id", auth("ADMIN"), VenueController.deleteVenue);

router.post("/:id/favorite", auth(), VenueController.toggleFavorite);
router.post("/:id/rating", auth(), VenueController.submitRating);
router.post("/:id/vibe", auth(), VenueController.submitVibe);

// Booking attribution — log every click on a venue's "Book" CTA so we
// can show venue owners how much traffic Pink Pineapple drove. Returns
// the redirect URL with utm_source + pp_click_id appended for dashboard
// attribution in the venue's own analytics.
router.post("/:id/booking-click", optionalAuth, BookingClickController.recordClick);
// Cross-venue overview for the analytics dashboard — must come BEFORE
// the /:id pattern so Express doesn't mistake "booking-clicks" for an id.
router.get(
  "/booking-clicks/overview",
  auth("ADMIN", "CLUB"),
  BookingClickController.getOverview
);
// Aggregate click metrics for one venue — accessible to ADMIN + CLUB owners.
router.get("/:id/booking-clicks", auth("ADMIN", "CLUB"), BookingClickController.getStats);

export const VenueRoutes = router;
