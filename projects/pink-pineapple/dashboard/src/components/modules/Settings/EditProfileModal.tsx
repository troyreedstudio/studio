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

const EditProfileModal = ({ userData }: { userData: any }) => {
  const [open, setOpen] = useState(false);
  const [updateUser] = useUpdateProfileMutation();

  const handleSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Updating...");
    const formData = new FormData();
    if (data.image) formData.append("profile", data.image);
    formData.append(
      "data",
      JSON.stringify({
        fullName: data?.fullName,
        phoneNumber: data?.phoneNumber,
        fullAddress: data?.fullAddress,
      })
    );
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

      <DialogContent className="border border-[#2A2A2A] bg-[#1A1A1A] max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-semibold text-[#FFFFFF] mb-2"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
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
                }}
              >
                <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>Profile Photo</p>
                <div className="flex gap-5 items-center mb-5">
                  <Image
                    src={userData?.profileImage || "/placeholders/image_placeholder.png"}
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
                <MyFormInput name="fullName" label="Full Name" placeholder="Full name" />
                <MyFormInput name="phoneNumber" label="Phone Number" placeholder="Phone number" />
                <MyFormInput name="fullAddress" label="Address" placeholder="Address" />
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
