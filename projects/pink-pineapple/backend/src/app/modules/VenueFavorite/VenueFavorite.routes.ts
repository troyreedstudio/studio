import express from "express";
import auth from "../../middlewares/auth";
import { VenueFavoriteController } from "./VenueFavorite.controller";

const router = express.Router();

router.post("/:venueId", auth(), VenueFavoriteController.toggleFavorite);
router.get("/", auth(), VenueFavoriteController.getUserFavorites);

export const VenueFavoriteRoutes = router;
