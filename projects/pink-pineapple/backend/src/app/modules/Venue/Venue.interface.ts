export type IVenueFilterRequest = {
  searchTerm?: string | undefined;
  area?: string | undefined;
  category?: string | undefined;
  isFeatured?: string | undefined;
  isActive?: string | undefined;
};

export const venueFilterableFields = [
  // "searchTerm" lives in this list (not just the typed interface) so the
  // controller's pick() preserves it through to the service, where the
  // OR-contains query against name + description + editorial runs.
  "searchTerm",
  "area",
  "category",
  "isFeatured",
  "isActive",
];

export const venueSearchableFields = ["name", "description", "editorial"];
