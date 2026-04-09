/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useUpdateBookingStatusMutation,
  useUpdateEventStatusMutation,
} from "@/redux/features/events/events.spi";
import { useUpdateUserStatusMutation } from "@/redux/features/user/user.api";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteModalProps {
  id: string;
  type: "event" | "approve" | "booking";
  btn: "icon" | "btn" | "approve";
  message: string;
  action?: "APPROVED" | "REJECTED";
  bookAction?: "ACCEPTED" | "REJECTED";
  approveAction?: "ACTIVE" | "INACTIVE";
}

const DeleteModal = ({
  id,
  type,
  btn,
  message,
  action,
  bookAction,
  approveAction,
}: DeleteModalProps) => {
  const [open, setOpen] = useState(false);
  const [updateStatus] = useUpdateEventStatusMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [updateBookingStatus] = useUpdateBookingStatusMutation();
  const router = useRouter();

  const handleAction = async () => {
    const toastId = toast.loading(`${message} in progress...`);
    try {
      let res;
      if (type === "event") {
        res = await updateStatus({ id, data: { eventStatus: action } }).unwrap();
        if (res) router.push("/");
      } else if (type === "approve") {
        const formData = new FormData();
        formData.append("data", JSON.stringify({ status: approveAction }));
        res = await updateUserStatus({ id, data: { status: approveAction } }).unwrap();
      } else if (type === "booking") {
        res = await updateBookingStatus({ status: bookAction, bookingId: id }).unwrap();
      }

      if (res?.data) {
        toast.success(`${message} successful!`, { id: toastId });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res?.error?.data?.message || `Failed to ${message}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.data?.message || `Failed to ${message}`, { id: toastId });
    }
  };

  const isApprove = action === "APPROVED" || approveAction === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {btn === "icon" ? (
        <DialogTrigger className="bg-red-500/10 p-3 rounded-full text-red-400 hover:bg-red-500/20 transition-colors">
          <Trash2 size={18} />
        </DialogTrigger>
      ) : btn === "approve" ? (
        <DialogTrigger
          className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
            boxShadow: '0 4px 16px rgba(139, 64, 96, 0.2)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Approve
        </DialogTrigger>
      ) : (
        <DialogTrigger
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200
            ${isApprove
              ? "text-[#000000] hover:opacity-90"
              : "text-[#C4707E] border border-[#C4707E]/40 hover:border-[#C4707E] hover:bg-[#C4707E]/5"
            }`}
          style={isApprove ? {
            background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
            fontFamily: 'Poppins, sans-serif',
          } : { fontFamily: 'Poppins, sans-serif' }}
        >
          {message}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-[420px] rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col items-center text-center gap-5 pt-2">
              <h3
                className="text-lg font-semibold text-[#FFFFFF]"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                {`Are you sure you want to ${message.toLowerCase()} this?`}
              </h3>
              <p className="text-sm text-[#B0B0B0]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                This action cannot be reverted.
              </p>

              <div className="flex justify-center gap-3 mt-2 w-full">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] px-5 py-2.5 rounded-xl text-sm transition-colors"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000000] transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;
