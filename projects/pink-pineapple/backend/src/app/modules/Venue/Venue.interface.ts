export type IVenueFilterRequest = {
  searchTerm?: string | undefined;
  area?: string | undefined;
  category?: string | undefined;
  isFeatured?: string | undefined;
  isActive?: string | undefined;
};

export const venueFilterableFields = [
  "area",
  "category",
  "isFeatured",
  "isActive",
];

export const venueSearchableFields = ["name", "description", "editorial"];
