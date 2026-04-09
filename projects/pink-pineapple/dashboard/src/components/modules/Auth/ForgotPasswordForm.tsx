/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import { useForgotPasswordMutation } from "@/redux/features/auth/authApi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";

const ForgotPasswordForm = () => {
  const [forgotPassword] = useForgotPasswordMutation();

  const router = useRouter();

  const onSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Sending reset OTP...");

    try {
      const res = await forgotPassword(data).unwrap();

      toast.success(res?.message || "Check your email!", {
        id: toastId,
      });

      // ✅ redirect with email as search params
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
      }, 1000);
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to send OTP", {
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
          Forgot Password
        </h3>
        <p className="text-[#B0B0B0] text-sm"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          Enter your email address and we&apos;ll send you a code to reset your
          password.
        </p>
      </div>

      <MyFormWrapper onSubmit={onSubmit}>
        <MyFormInput
          type="email"
          name="email"
          label="Email"
          placeholder="Enter your email"
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
            Reset Password
          </button>

          <Link
            href="/login"
            className="text-center text-sm text-[#C4707E] hover:text-[#E8A0B0] transition-colors"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Back to Login
          </Link>
        </div>
      </MyFormWrapper>
    </div>
  );
};

export default ForgotPasswordForm;
