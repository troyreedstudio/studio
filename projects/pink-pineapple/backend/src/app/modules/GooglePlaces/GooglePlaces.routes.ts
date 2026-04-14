import express from "express";
import { GooglePlacesController } from "./GooglePlaces.controller";

const router = express.Router();

router.get("/search", GooglePlacesController.searchPlaces);
router.get("/status", GooglePlacesController.status);

export const GooglePlacesRoutes = router;
