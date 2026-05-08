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
import { useAppSelector } from "@/redux/hooks";
import { selectCurrentUser } from "@/redux/features/auth/authSlice";

// Edit Profile modal — account holder details only. Venue partners
// manage their venue's PUBLIC fields (description, photos, hours,
// Instagram, address, etc.) on /club/venue. This modal is strictly for
// account-level info: photo, name (= venue name for partners), phone,
// and Tax ID (CLUB role only). Consumer-app-shaped fields like DOB,
// gender, country, city, bio, profile privacy were removed — they were
// holdover from when this dashboard was used by end-user accounts.
const EditProfileModal = ({ userData }: { userData: any }) => {
  const [open, setOpen] = useState(false);
  const [updateUser] = useUpdateProfileMutation();
  const authUser = useAppSelector(selectCurrentUser);
  const isPartner = authUser?.role === "CLUB";

  const handleSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Updating...");
    const formData = new FormData();
    if (data.image) formData.append("profile", data.image);

    const payload: Record<string, unknown> = {
      fullName: data?.fullName,
      phoneNumber: data?.phoneNumber,
    };
    // Tax ID only relevant for venue partners.
    if (isPartner && data?.taxId !== undefined) {
      payload.taxId = data.taxId;
    }

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

  const nameLabel = isPartner ? "Venue Name" : "Full Name";
  const namePlaceholder = isPartner ? "e.g. Savaya Bali" : "Full name";

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
            {isPartner ? "Edit Account Details" : "Edit Profile"}
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              {isPartner && (
                <p
                  className="text-[11px] text-[#B0B0B0] mb-4"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Description, photos, hours, Instagram, and booking lives on your{" "}
                  <span className="text-[#E8A0B0]">My Venue Profile</span>. This
                  is just your account info.
                </p>
              )}
              <MyFormWrapper
                onSubmit={handleSubmit}
                defaultValues={{
                  fullName: userData?.fullName,
                  phoneNumber: userData?.phoneNumber,
                  taxId: userData?.taxId,
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
                  label={nameLabel}
                  placeholder={namePlaceholder}
                />
                <MyFormInput
                  name="phoneNumber"
                  label={isPartner ? "Account Phone" : "Phone Number"}
                  placeholder="+62 ..."
                />
                {isPartner && (
                  <MyFormInput
                    name="taxId"
                    label="Tax ID (optional)"
                    placeholder="NPWP or registration number"
                    required={false}
                  />
                )}
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
