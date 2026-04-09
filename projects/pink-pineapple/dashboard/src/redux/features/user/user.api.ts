import baseApi from "@/redux/api/baseApi";
import { TQueryParams } from "@/types/user.type";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allUser: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

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
      providesTags: ["User"],
    }),

    singleUser: builder.query({
      query: (id) => ({
        url: `/auth/${id}`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    updateUserProfile: builder.mutation({
      query: (args) => ({
        url: `/users/update-profile/${args.id}`,
        method: "PUT",
        body: args.data,
      }),
      invalidatesTags: ["User"],
    }),

    updateUserStatus: builder.mutation({
      query: (args) => ({
        url: `/users/${args.id}`,
        method: "PUT",
        body: args.data,
      }),
      invalidatesTags: ["User"],
    }),

    updateStatus: builder.mutation({
      query: (args) => ({
        url: `/user/user-status/${args.id}`,
        method: "PUT",
        body: args.data,
      }),
      invalidatesTags: ["User"],
    }),

    unapprovedUser: builder.query({
      query: (args) => {
        const params = new URLSearchParams();

        if (args) {
          args.forEach((item: TQueryParams) => {
            params.append(item.name, item.value as string);
          });
        }
        return {
          url: "/user/unapproved-users",
          method: "GET",
          params: params,
        };
      },
      providesTags: ["User"],
    }),

    approveUser: builder.mutation({
      query: (data) => ({
        url: `/user/approve-user`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useAllUserQuery,
  useSingleUserQuery,
  useUpdateUserProfileMutation,
  useUpdateUserStatusMutation,
  useUpdateStatusMutation,
  useUnapprovedUserQuery,
  useApproveUserMutation,
} = userApi;
