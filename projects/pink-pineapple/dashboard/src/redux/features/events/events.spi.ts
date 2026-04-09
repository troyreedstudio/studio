import baseApi from "@/redux/api/baseApi";
import { TQueryParams } from "@/types/user.type";

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allEvents: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/events",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["Event"],
    }),

    createEvent: builder.mutation({
      query: (data) => ({
        url: `/events`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    myEvents: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/events/my-event",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["Event"],
    }),

    singleEvent: builder.query({
      query: (id) => ({
        url: `/events/${id}`,
        method: "GET",
      }),
    }),

    updateEventStatus: builder.mutation({
      query: (args) => ({
        url: `/events/update-status/${args.id}`,
        method: "PUT",
        body: args.data,
      }),
      invalidatesTags: ["User"],
    }),

    allBookings: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/booking",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["Booking"],
    }),

    updateBookingStatus: builder.mutation({
      query: (data) => ({
        url: `/booking/update-status`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Booking"],
    }),
  }),
});

export const {
  useAllEventsQuery,
  useCreateEventMutation,
  useSingleEventQuery,
  useUpdateEventStatusMutation,
  useAllBookingsQuery,
  useUpdateBookingStatusMutation,
  useMyEventsQuery,
} = eventsApi;
