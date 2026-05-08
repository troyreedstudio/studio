import express from "express";
import { GooglePlacesController } from "./GooglePlaces.controller";
import { ExternalClickController } from "./ExternalClick.controller";
import { optionalAuth } from "../Venue/Venue.optionalAuth";

const router = express.Router();

router.get("/search", GooglePlacesController.searchPlaces);
router.get("/status", GooglePlacesController.status);
// Log a redirect click to a Google Places result. Anonymous users can
// fire this too — userId is recorded if a token is present.
router.post(
  "/external-click",
  optionalAuth,
  ExternalClickController.recordExternalClick
);

export const GooglePlacesRoutes = router;
