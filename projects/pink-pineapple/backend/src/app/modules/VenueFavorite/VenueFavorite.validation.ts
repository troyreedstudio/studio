import { z } from "zod";

const toggleSchema = z.object({
  venueId: z.string().min(1, "Venue ID is required"),
});

export const VenueFavoriteValidation = {
  toggleSchema,
};
