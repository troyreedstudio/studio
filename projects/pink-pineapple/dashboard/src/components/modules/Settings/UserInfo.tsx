/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Image from "next/image";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import MyFormInput from "@/components/form/MyFormInput";
import MyBtn from "@/components/common/MyBtn";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";
import {
  useChangePasswordMutation,
  useGetMeQuery,
} from "@/redux/features/auth/authApi";
import { useAppDispatch } from "@/redux/hooks";
import { logout } from "@/redux/features/auth/authSlice";
import Spinner from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import EditProfileModal from "./EditProfileModal";

const UserInfo = () => {
  const router = useRouter();
  const [changePass] = useChangePasswordMutation();
  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetMeQuery(undefined);

  if (isLoading) {
    return <Spinner />;
  }

  const userData = data?.data?.userProfile;

  const handleSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Updating password...");

    try {
      await changePass(data).unwrap();
      dispatch(logout());
      toast.success("Password changed successfully", { id: toastId });
      router.push("/login");
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to change password", {
        id: toastId,
      });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Personal Info card */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-5">
        <div className="flex justify-between items-center gap-2">
          <h2
            className="text-xl font-semibold text-[#FFFFFF]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Personal Information
          </h2>
          <EditProfileModal userData={userData} />
        </div>

        <div className="flex justify-center">
          <div className="relative">
            <Image
              src={userData?.profileImage || "/placeholders/image_placeholder.png"}
              alt="profile"
              height={200}
              width={200}
              className="w-28 h-28 rounded-full object-cover border-2 border-[#2A2A2A]"
            />
            <div className="absolute inset-0 rounded-full border border-[#C4707E]/30" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Name</h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.fullName}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Mobile</h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.phoneNumber}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Address</h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.fullAddress || "—"}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Email</h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.email}</p>
          </div>
        </div>
      </div>

      {/* Change Password card */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-5">
        <h2
          className="text-xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Change Password
        </h2>
        <MyFormWrapper onSubmit={handleSubmit}>
          <MyFormInput name="oldPassword" label="Old Password" type="password" />
          <MyFormInput name="newPassword" label="New Password" type="password" />
          <MyBtn name="Confirm" width="w-full" />
        </MyFormWrapper>
      </div>
    </div>
  );
};

export default UserInfo;
