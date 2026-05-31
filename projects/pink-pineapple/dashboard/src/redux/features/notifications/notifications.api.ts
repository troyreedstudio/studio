import baseApi from "@/redux/api/baseApi";

// Push notification broadcast. Fires the backend's
// POST /notifications/broadcast which fans out to every user with a
// registered fcmToken via Firebase Admin SDK. Admin-gated server-side;
// the dashboard only renders this surface for ADMIN-role users.
//
// Also exposes the schedule + audit + cancel endpoints powered by the
// backend worker tick (runs every 60s, fires due PENDING rows).
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendBroadcast: builder.mutation({
      query: (data: { title: string; body: string }) => ({
        url: `/notifications/broadcast`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ScheduledNotification"],
    }),
    scheduleBroadcast: builder.mutation({
      query: (data: { title: string; body: string; scheduledFor: string }) => ({
        url: `/notifications/schedule`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ScheduledNotification"],
    }),
    listScheduled: builder.query({
      query: () => ({ url: `/notifications/scheduled`, method: "GET" }),
      providesTags: ["ScheduledNotification"],
    }),
    cancelScheduled: builder.mutation({
      query: (id: string) => ({
        url: `/notifications/scheduled/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ScheduledNotification"],
    }),
  }),
});

export const {
  useSendBroadcastMutation,
  useScheduleBroadcastMutation,
  useListScheduledQuery,
  useCancelScheduledMutation,
} = notificationsApi;
