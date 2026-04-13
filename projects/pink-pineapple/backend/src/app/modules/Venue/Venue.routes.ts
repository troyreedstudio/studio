import express from "express";
import auth from "../../middlewares/auth";
import { VenueController } from "./Venue.controller";
import validateRequest from "../../middlewares/validateRequest";
import { VenueValidation } from "./Venue.validation";
import { optionalAuth } from "./Venue.optionalAuth";

const router = express.Router();

// Public routes (browse-first, sign-up-at-booking)
router.get("/", optionalAuth, VenueController.getVenueList);
router.get("/featured", optionalAuth, VenueController.getFeatured);
router.get("/area/:area", optionalAuth, VenueController.getByArea);
router.get("/search", optionalAuth, VenueController.searchVenues);
router.get("/whats-on", optionalAuth, VenueController.getWhatsOn);
router.get("/whats-on/:day", optionalAuth, VenueController.getWhatsOn);
router.get("/:id", optionalAuth, VenueController.getVenueById);

// Protected routes
router.post(
  "/",
  auth("ADMIN", "CLUB"),
  validateRequest(VenueValidation.createSchema),
  VenueController.createVenue
);

router.put(
  "/:id",
  auth("ADMIN", "CLUB"),
  validateRequest(VenueValidation.updateSchema),
  VenueController.updateVenue
);

router.delete("/:id", auth("ADMIN"), VenueController.deleteVenue);

router.post("/:id/favorite", auth(), VenueController.toggleFavorite);

export const VenueRoutes = router;
