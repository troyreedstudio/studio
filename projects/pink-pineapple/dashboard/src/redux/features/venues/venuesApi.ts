import baseApi from "@/redux/api/baseApi";
import { TQueryParams } from "@/types/user.type";

export const venuesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVenues: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/venues",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["Venue"],
    }),

    getFeaturedVenues: builder.query({
      query: () => ({
        url: "/venues/featured",
        method: "GET",
      }),
      providesTags: ["Venue"],
    }),

    getVenue: builder.query({
      query: (id) => ({
        url: `/venues/${id}`,
        method: "GET",
      }),
      providesTags: ["Venue"],
    }),

    createVenue: builder.mutation({
      query: (data) => ({
        url: "/venues",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Venue"],
    }),

    updateVenue: builder.mutation({
      query: (args) => ({
        url: `/venues/${args.id}`,
        method: "PUT",
        body: args.data,
      }),
      invalidatesTags: ["Venue"],
    }),

    deleteVenue: builder.mutation({
      query: (id) => ({
        url: `/venues/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Venue"],
    }),

    // CLUB venue owners — list of venues owned by current user
    getOwnedVenues: builder.query({
      query: () => ({
        url: "/venues/owned",
        method: "GET",
      }),
      providesTags: ["Venue"],
    }),

    // Stats for one venue (PP rating, Google rating, vibe, favorites, recent
    // ratings + vibes). Used by both club home stats panel + admin venue edit.
    getVenueStats: builder.query({
      query: (id) => ({
        url: `/venues/${id}/stats`,
        method: "GET",
      }),
      providesTags: ["Venue"],
    }),

    // Booking-click attribution stats — overview across all venues in scope.
    // ADMIN sees everything; CLUB sees only their owned venues.
    getBookingClicksOverview: builder.query({
      query: (windowDays: number = 30) => ({
        url: `/venues/booking-clicks/overview?windowDays=${windowDays}`,
        method: "GET",
      }),
    }),

    // Per-venue click stats — total + windowed + byDay sparkline + last click.
    getVenueBookingClicks: builder.query({
      query: (args: { id: string; windowDays?: number }) => ({
        url: `/venues/${args.id}/booking-clicks?windowDays=${args.windowDays ?? 30}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetVenuesQuery,
  useGetFeaturedVenuesQuery,
  useGetVenueQuery,
  useCreateVenueMutation,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
  useGetOwnedVenuesQuery,
  useGetVenueStatsQuery,
  useGetBookingClicksOverviewQuery,
  useGetVenueBookingClicksQuery,
} = venuesApi;
