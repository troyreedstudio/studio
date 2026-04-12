import { z } from "zod";

const VenueAreaEnum = z.enum(["CANGGU", "ULUWATU", "SEMINYAK", "UBUD"]);
const VenueCategoryEnum = z.enum([
  "BEACH_CLUB",
  "RESTAURANT",
  "NIGHTLIFE",
  "WELLNESS",
  "EVENTS",
]);

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  area: VenueAreaEnum,
  category: VenueCategoryEnum,
  ownerId: z.string().min(1, "Owner ID is required"),
  description: z.string().optional(),
  editorial: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  priceRange: z.number().int().min(1).max(4).optional(),
  openingHours: z.any().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  area: VenueAreaEnum.optional(),
  category: VenueCategoryEnum.optional(),
  description: z.string().optional(),
  editorial: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  priceRange: z.number().int().min(1).max(4).optional(),
  openingHours: z.any().optional(),
  heroImage: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const VenueValidation = {
  createSchema,
  updateSchema,
};
