import { Request, Response } from "express";
import { googlePlacesService } from "./GooglePlaces.service";

const searchPlaces = async (req: Request, res: Response) => {
  try {
    const { searchTerm, type } = req.query;

    if (!searchTerm || typeof searchTerm !== "string") {
      return res.status(400).json({
        success: false,
        message: "searchTerm query parameter is required",
      });
    }

    if (!googlePlacesService.isConfigured()) {
      return res.json({
        success: true,
        message: "Google Places not configured — add GOOGLE_PLACES_API_KEY to .env",
        data: [],
        configured: false,
      });
    }

    const results = await googlePlacesService.searchPlaces(
      searchTerm,
      type as string | undefined
    );

    return res.json({
      success: true,
      message: "Google Places search results",
      data: results,
      configured: true,
    });
  } catch (error) {
    console.error("Google Places controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search Google Places",
    });
  }
};

const status = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    configured: googlePlacesService.isConfigured(),
    message: googlePlacesService.isConfigured()
      ? "Google Places API is configured"
      : "Add GOOGLE_PLACES_API_KEY to .env to enable",
  });
};

export const GooglePlacesController = {
  searchPlaces,
  status,
};
