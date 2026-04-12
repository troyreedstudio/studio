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
  }),
});

export const {
  useGetVenuesQuery,
  useGetFeaturedVenuesQuery,
  useGetVenueQuery,
  useCreateVenueMutation,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
} = venuesApi;
