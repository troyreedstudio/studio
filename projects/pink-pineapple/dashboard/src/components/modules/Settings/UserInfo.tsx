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
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logout, selectCurrentUser } from "@/redux/features/auth/authSlice";
import Spinner from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import EditProfileModal from "./EditProfileModal";

const UserInfo = () => {
  const router = useRouter();
  const [changePass] = useChangePasswordMutation();
  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetMeQuery(undefined);
  const authUser = useAppSelector(selectCurrentUser);
  const isPartner = authUser?.role === "CLUB";

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
            style={{ fontFamily: 'Outfit, sans-serif' }}
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
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isPartner ? "Venue Name" : "Name"}
            </h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.fullName}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isPartner ? "Account Phone" : "Mobile"}
            </h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.phoneNumber}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Email</h3>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.email}</p>
          </div>
          {isPartner && (
            <div className="space-y-1">
              <h3 className="text-xs text-[#B0B0B0] uppercase tracking-widest"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Tax ID</h3>
              <p className="text-sm text-[#FFFFFF]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>{userData?.taxId || "—"}</p>
            </div>
          )}
        </div>
        {isPartner && (
          <p className="text-[11px] text-[#6B6B6B] pt-2 border-t border-[#1A1A1A]"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            To edit your venue's description, photos, hours, Instagram or booking link,
            visit <span className="text-[#E8A0B0]">My Venue Profile</span>.
          </p>
        )}
      </div>

      {/* Change Password card */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-5">
        <h2
          className="text-xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
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
