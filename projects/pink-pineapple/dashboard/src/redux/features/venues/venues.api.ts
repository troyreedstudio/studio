import baseApi from "@/redux/api/baseApi";
import { TQueryParams } from "@/types/user.type";

export const venueUserApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allVenues: builder.query({
      query: (args) => {
        const params = new URLSearchParams();
        params.append("role", "CLUB");

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/users",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["User", "Venue"],
    }),

    singleVenue: builder.query({
      query: (id) => ({
        url: `/auth/${id}`,
        method: "GET",
      }),
      providesTags: ["User", "Venue"],
    }),

    updateVenueStatus: builder.mutation({
      query: (args) => ({
        url: `/users/${args.id}`,
        method: "PUT",
        body: { status: args.status },
      }),
      invalidatesTags: ["User", "Venue"],
    }),

    deleteVenue: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Venue"],
    }),

    approveVenue: builder.mutation({
      query: (userId) => ({
        url: `/user/approve-user`,
        method: "PUT",
        body: { userId, isApproved: true },
      }),
      invalidatesTags: ["User", "Venue"],
    }),
  }),
});

export const {
  useAllVenuesQuery,
  useSingleVenueQuery,
  useUpdateVenueStatusMutation,
  useDeleteVenueMutation,
  useApproveVenueMutation,
} = venueUserApi;
