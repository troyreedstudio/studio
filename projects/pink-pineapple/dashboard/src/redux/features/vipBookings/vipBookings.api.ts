import baseApi from "@/redux/api/baseApi";

export type VipBookingStatus =
  | "PENDING"
  | "SENT_TO_VENUE"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED";

export const vipBookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listVipBookings: builder.query({
      query: (status?: VipBookingStatus) => {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        return {
          url: `/vip-bookings`,
          method: "GET",
          params,
        };
      },
      providesTags: ["VipBooking"],
    }),

    getVipBooking: builder.query({
      query: (id: string) => ({
        url: `/vip-bookings/${id}`,
        method: "GET",
      }),
      providesTags: ["VipBooking"],
    }),

    updateVipBooking: builder.mutation({
      query: ({
        id,
        data,
      }: {
        id: string;
        data: {
          status?: VipBookingStatus;
          paymentUrl?: string;
          internalNotes?: string;
        };
      }) => ({
        url: `/vip-bookings/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["VipBooking"],
    }),
  }),
});

export const {
  useListVipBookingsQuery,
  useGetVipBookingQuery,
  useUpdateVipBookingMutation,
} = vipBookingsApi;
