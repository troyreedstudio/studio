/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import { useResetPasswordMutation } from "@/redux/features/auth/authApi";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [resetPassword] = useResetPasswordMutation();

  const onSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Resetting password...");

    if (data.password !== data.confirmPassword) {
      return toast.error("Passwords do not match", { id: toastId });
    }

    try {
      const payload = {
        email,
        password: data.password,
      };

      const res = await resetPassword(payload).unwrap();

      toast.success(res?.message || "Password reset successfully", {
        id: toastId,
      });

      // redirect to login
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to reset password", {
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
          Reset Password
        </h3>
        <p className="text-[#B0B0B0] text-sm"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          Enter your new password for{" "}
          <span className="text-[#C4707E]">{email}</span>
        </p>
      </div>

      <MyFormWrapper onSubmit={onSubmit}>
        <MyFormInput
          type="password"
          name="password"
          label="New Password"
          placeholder="Enter new password"
        />

        <MyFormInput
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
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
        </div>
      </MyFormWrapper>
    </div>
  );
};

export default ResetPasswordForm;
