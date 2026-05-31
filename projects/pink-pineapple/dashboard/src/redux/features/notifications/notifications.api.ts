import baseApi from "@/redux/api/baseApi";

// Push notification broadcast. Fires the backend's
// POST /notifications/broadcast which fans out to every user with a
// registered fcmToken via Firebase Admin SDK. Admin-gated server-side;
// the dashboard only renders this surface for ADMIN-role users.
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendBroadcast: builder.mutation({
      query: (data: { title: string; body: string }) => ({
        url: `/notifications/broadcast`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useSendBroadcastMutation } = notificationsApi;
