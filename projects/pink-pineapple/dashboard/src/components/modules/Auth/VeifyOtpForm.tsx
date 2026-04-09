/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  useResendOtpMutation,
  useVerifyOtpMutation,
} from "@/redux/features/auth/authApi";

const OTPVerifyForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [verifyOtp] = useVerifyOtpMutation();
  const [resendOtp] = useResendOtpMutation();

  const [timer, setTimer] = useState(60);

  // countdown timer
  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const onSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Verifying OTP...");

    try {
      const payload = {
        email,
        otp: Number(data.otp),
      };

      const res = await verifyOtp(payload).unwrap();

      toast.success(res?.message || "OTP verified successfully", {
        id: toastId,
      });

      // redirect to reset password page
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email || "")}`);
      }, 1000);
    } catch (err: any) {
      toast.error(err.data?.message || "Invalid OTP", {
        id: toastId,
      });
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;

    const toastId = toast.loading("Resending OTP...");

    try {
      const res = await resendOtp({ email }).unwrap();

      toast.success(res?.message || "OTP resent successfully", {
        id: toastId,
      });

      setTimer(60);
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to resend OTP", {
        id: toastId,
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 py-6">
      <div className="space-y-3 text-center">
        <h3
          className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Verify OTP
        </h3>
        <p className="text-[#B0B0B0] text-sm"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          Enter the OTP sent to{" "}
          <span className="text-[#C4707E]">{email}</span>
        </p>
      </div>

      <MyFormWrapper onSubmit={onSubmit}>
        <MyFormInput
          type="number"
          name="otp"
          label="Enter OTP"
          placeholder="Enter 4-digit OTP"
        />

        <div className="space-y-4 flex flex-col">
          <button
            className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
              boxShadow: '0 4px 16px rgba(139, 64, 96, 0.25)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Verify OTP
          </button>

          {timer > 0 ? (
            <p className="text-center text-sm text-[#B0B0B0]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              Resend OTP in {timer}s
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-center text-sm text-[#C4707E] hover:text-[#E8A0B0] transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Resend OTP
            </button>
          )}
        </div>
      </MyFormWrapper>
    </div>
  );
};

export default OTPVerifyForm;
