import baseApi from "@/redux/api/baseApi";

export const registerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    availableDays: builder.query({
      query: () => ({
        url: "/availableDays",
        method: "GET",
      }),
    }),

    availableTime: builder.query({
      query: () => ({
        url: "/available-time",
        method: "GET",
      }),
    }),

    insertDays: builder.mutation({
      query: (data) => ({
        url: "/clubs-available",
        method: "POST",
        body: data,
      }),
    }),

    insertTimes: builder.mutation({
      query: (data) => ({
        url: "/club-available-time",
        method: "POST",
        body: data,
      }),
    }),

    verifyRegisterOtp: builder.mutation({
      query: (data: { email: string; otp: number }) => ({
        url: "/auth/verify-register-otp",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useAvailableDaysQuery,
  useAvailableTimeQuery,
  useInsertDaysMutation,
  useInsertTimesMutation,
  useVerifyRegisterOtpMutation,
} = registerApi;
