/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { setUser, TUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { setCookie } from "@/utils/cookies";
import { varifyToken } from "@/utils/verifyToken";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";

const LoginForm = () => {
  const dispatch = useAppDispatch();
  const [login] = useLoginMutation();
  const router = useRouter();

  const onSubmit = async (data: FieldValues) => {
    const toastId = toast.loading("Signing in...");

    try {
      const res = await login(data).unwrap();
      const user = varifyToken(res.data.token) as TUser;

      if (user?.role !== "ADMIN" && user?.role !== "CLUB") {
        return toast.error("Unauthorised access", { id: toastId });
      } else {
        setCookie(res.data.token);
        dispatch(setUser({ user, token: res.data.token }));

        toast.success("Welcome back", { id: toastId });

        setTimeout(() => {
          if (user?.role === "ADMIN") {
            router.push("/");
          } else {
            router.push("/club");
          }
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to sign in", { id: toastId });
    }
  };

  return (
    <div className="max-w-sm w-full space-y-8">
      <div className="space-y-2">
        <h2
          className="text-3xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Sign In
        </h2>
        <p className="text-[#B0B0B0] text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Welcome back to your venue dashboard
        </p>
      </div>

      <MyFormWrapper onSubmit={onSubmit}>
        <div className="space-y-4">
          <MyFormInput
            type="email"
            name="email"
            label="Email"
            placeholder="your@email.com"
          />

          <MyFormInput
            type="password"
            name="password"
            label="Password"
            placeholder="Enter your password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[#C4707E] text-sm hover:text-[#E8A0B0] transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 mt-2"
            style={{
              background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
              boxShadow: '0 4px 20px rgba(139, 64, 96, 0.3)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Sign In
          </button>
        </div>
      </MyFormWrapper>

      <p className="text-center text-[#6B6B6B] text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#C4707E] hover:text-[#E8A0B0] transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
