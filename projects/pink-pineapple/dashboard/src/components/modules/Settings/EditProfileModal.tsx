/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MyBtn from "@/components/common/MyBtn";
import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SquarePen } from "lucide-react";
import Image from "next/image";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { useUpdateProfileMutation } from "@/redux/features/auth/authApi";

const formatDateForInput = (dob: any): string => {
  if (!dob) return "";
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const EditProfileModal = ({ userData }: { userData: any }) => {
  const [open, setOpen] = useState(false);
  const [updateUser] = useUpdateProfileMutation();

  const handleSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Updating...");
    const formData = new FormData();
    if (data.image) formData.append("profile", data.image);

    const payload: Record<string, unknown> = {
      fullName: data?.fullName,
      phoneNumber: data?.phoneNumber,
      fullAddress: data?.fullAddress,
      bio: data?.bio,
      instagram: data?.instagram,
      country: data?.country,
      city: data?.city,
      gender: data?.gender,
      profilePrivacy: data?.profilePrivacy,
    };
    if (data?.dob) payload.dob = data.dob;

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === "") delete payload[k];
    });

    formData.append("data", JSON.stringify(payload));
    try {
      await updateUser(formData).unwrap();
      setOpen(false);
      toast.success("Updated successfully", { id: toastId });
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to Update", { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-[#C4707E] hover:text-[#E8A0B0] transition-colors">
        <SquarePen size={22} />
      </DialogTrigger>

      <DialogContent className="border border-[#2A2A2A] bg-[#1A1A1A] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-semibold text-[#FFFFFF] mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Edit Profile
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <MyFormWrapper
                onSubmit={handleSubmit}
                defaultValues={{
                  fullName: userData?.fullName,
                  phoneNumber: userData?.phoneNumber,
                  fullAddress: userData?.fullAddress,
                  bio: userData?.bio,
                  instagram: userData?.instagram,
                  country: userData?.country,
                  city: userData?.city,
                  gender: userData?.gender,
                  profilePrivacy: userData?.profilePrivacy,
                  dob: formatDateForInput(userData?.dob),
                }}
              >
                <p
                  className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Profile Photo
                </p>
                <div className="flex gap-5 items-center mb-5">
                  <Image
                    src={
                      userData?.profileImage ||
                      "/placeholders/image_placeholder.png"
                    }
                    alt="user"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border border-[#2A2A2A]"
                  />
                  <div className="flex-1">
                    <MyFormInput
                      type="file"
                      acceptType="image/*"
                      name="image"
                      filePlaceholder="Upload new photo"
                      required={false}
                    />
                  </div>
                </div>

                <MyFormInput
                  name="fullName"
                  label="Full Name"
                  placeholder="Full name"
                />
                <MyFormInput
                  name="phoneNumber"
                  label="Phone Number"
                  placeholder="Phone number"
                />
                <MyFormInput
                  name="dob"
                  label="Date of Birth"
                  type="date"
                  placeholder="YYYY-MM-DD"
                  required={false}
                />
                <MyFormInput
                  name="gender"
                  label="Gender"
                  placeholder="Male / Female / Non-binary / Prefer not to say"
                  required={false}
                />
                <MyFormInput
                  name="instagram"
                  label="Instagram Handle"
                  placeholder="@yourhandle"
                  required={false}
                />
                <MyFormInput
                  name="country"
                  label="Country"
                  placeholder="Country"
                  required={false}
                />
                <MyFormInput
                  name="city"
                  label="City"
                  placeholder="City"
                  required={false}
                />
                <MyFormInput
                  name="fullAddress"
                  label="Address"
                  placeholder="Address"
                  required={false}
                />
                <MyFormInput
                  name="bio"
                  label="Bio"
                  placeholder="A short bio"
                  required={false}
                />
                <MyBtn name="Save Changes" width="w-full" />
              </MyFormWrapper>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
