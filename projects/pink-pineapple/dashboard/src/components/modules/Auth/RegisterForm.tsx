/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MyFormInput from "@/components/form/MyFormInput";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldValues } from "react-hook-form";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  useAvailableDaysQuery,
  useAvailableTimeQuery,
  useInsertDaysMutation,
  useInsertTimesMutation,
  useVerifyRegisterOtpMutation,
} from "@/redux/features/register/register.api";
import Spinner from "@/components/common/Spinner";
import {
  useRegisterMutation,
  useUpdateProfileMutation,
} from "@/redux/features/auth/authApi";
import { setCookie } from "@/utils/cookies";
import { useAppDispatch } from "@/redux/hooks";
import { setUser, TUser } from "@/redux/features/auth/authSlice";
import { varifyToken } from "@/utils/verifyToken";

const btnStyle = {
  background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
  boxShadow: '0 4px 16px rgba(139, 64, 96, 0.25)',
  fontFamily: 'Poppins, sans-serif',
};

const RegisterForm = () => {
  const [currentState, setCurrentState] = useState<
    "register" | "company" | "availability" | "otp"
  >("register");
  const [otp, setOtp] = useState("");
  const [registerData, setRegisterData] = useState<any>({});
  const [CompanyData, setCompanyData] = useState<any>({});
  const [days, setDay] = useState<string[]>([]);
  const [times, settime] = useState<string[]>([]);
  const [register] = useRegisterMutation();
  const [verifyOtp] = useVerifyRegisterOtpMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const [insertDays] = useInsertDaysMutation();
  const [insertTimes] = useInsertTimesMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { data: availableDays, isLoading } = useAvailableDaysQuery(undefined);
  const { data: availableTimes } = useAvailableTimeQuery(undefined);

  const submitRegister = (data: FieldValues) => {
    setRegisterData({ ...data, role: "CLUB" });
    setCurrentState("company");
  };

  const handleAvailable = () => {
    if (days.length < 1) { toast.error("Please select your available Days"); return; }
    if (times.length < 1) { toast.error("Please select your available Times"); return; }
    setCurrentState("otp");
  };

  const handleCompany = async (data: FieldValues) => {
    setCompanyData(data);
    try {
      const res = await register(registerData).unwrap();
      if (res) setCurrentState("availability");
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to Register");
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 4) { toast.error("Please enter the full 4-digit OTP"); return; }
    try {
      const res = await verifyOtp({ email: registerData.email, otp: parseInt(otp) }).unwrap();
      const user = varifyToken(res.data.accessToken) as TUser;
      if (res) {
        setCurrentState("otp");
        setCookie(res.data.accessToken);
        dispatch(setUser({ user, token: res.data.accessToken }));
        const { license, profile, ...rest } = CompanyData;
        const formData = new FormData();
        formData.append("license", license);
        formData.append("profile", profile);
        formData.append("data", JSON.stringify({ ...rest, isCompleteProfile: true }));
        await insertDays({ dayIds: days }).unwrap();
        await insertTimes({ timesId: times }).unwrap();
        const result = await updateProfile(formData).unwrap();
        if (result) router.push("/login");
      }
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to verify otp");
    }
  };

  if (isLoading) return <Spinner />;

  const handelDaySelect = (id: string) => {
    setDay(days.includes(id) ? days.filter((d) => d !== id) : [...days, id]);
  };

  const handelTimeSelect = (id: string) => {
    settime(times.includes(id) ? times.filter((t) => t !== id) : [...times, id]);
  };

  const sectionLabel = (text: string) => (
    <h3
      className="md:text-3xl text-2xl font-semibold text-[#FFFFFF] text-center"
      style={{ fontFamily: 'Cormorant Garamond, serif' }}
    >
      {text}
    </h3>
  );

  return (
    <div className="w-full max-w-md space-y-8 py-6">
      {currentState === "register" && (
        <div className="space-y-8">
          {sectionLabel("Create Account")}
          <MyFormWrapper onSubmit={submitRegister}>
            <MyFormInput name="fullName" label="Club Name" placeholder="Club name..." />
            <MyFormInput name="fullAddress" label="Club Address" placeholder="Address..." />
            <MyFormInput type="email" name="email" label="Email" placeholder="email@example.com" />
            <MyFormInput type="password" name="password" label="Password" placeholder="Password" />
            <MyFormInput name="phoneNumber" label="Phone" placeholder="+62..." />
            <button
              className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
              style={btnStyle}
            >
              Next
            </button>
          </MyFormWrapper>
        </div>
      )}

      {currentState === "company" && (
        <div className="space-y-8">
          {sectionLabel("Company Info")}
          <MyFormWrapper onSubmit={handleCompany}>
            <MyFormInput name="typeOfVenue" label="Type of Venue" placeholder="e.g. Nightclub, Beach Club..." />
            <MyFormInput name="taxId" label="TAX ID" placeholder="Tax ID..." />
            <MyFormInput type="file" name="license" label="Business License" acceptType="image/*" filePlaceholder="Upload Business License" />

            <div className="pt-4">
              <p className="text-[#B0B0B0] text-xs uppercase tracking-widest mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Personal Info</p>
              <MyFormInput type="file" name="profile" label="Profile Picture" acceptType="image/*" filePlaceholder="Upload profile photo" />
              <MyFormInput name="bio" label="Bio" placeholder="Tell us about yourself..." />
            </div>

            <button
              className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
              style={btnStyle}
            >
              Next
            </button>
          </MyFormWrapper>
        </div>
      )}

      {currentState === "availability" && (
        <div className="space-y-8">
          {sectionLabel("Availability")}
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs text-[#B0B0B0] uppercase tracking-widest"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Select Days</p>
              <div className="flex flex-wrap gap-2">
                {availableDays?.data?.map((item: any) => (
                  <div
                    key={item?.id}
                    onClick={() => handelDaySelect(item?.id)}
                    className={`px-4 py-2.5 rounded-xl border text-sm cursor-pointer transition-all duration-200 select-none
                      ${days.includes(item?.id)
                        ? "border-[#C4707E] text-[#000000] font-medium"
                        : "border-[#2A2A2A] text-[#B0B0B0] hover:border-[#C4707E]/50 hover:text-[#FFFFFF]"
                      }`}
                    style={
                      days.includes(item?.id)
                        ? { background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)', fontFamily: 'Poppins, sans-serif' }
                        : { fontFamily: 'Poppins, sans-serif' }
                    }
                  >
                    {item?.day}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#B0B0B0] uppercase tracking-widest"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Select Times</p>
              <div className="flex flex-wrap gap-2">
                {availableTimes?.data?.map((item: any) => (
                  <div
                    key={item?.id}
                    onClick={() => handelTimeSelect(item?.id)}
                    className={`px-4 py-2.5 rounded-xl border text-sm cursor-pointer transition-all duration-200 select-none
                      ${times.includes(item?.id)
                        ? "border-[#C4707E] text-[#000000] font-medium"
                        : "border-[#2A2A2A] text-[#B0B0B0] hover:border-[#C4707E]/50 hover:text-[#FFFFFF]"
                      }`}
                    style={
                      times.includes(item?.id)
                        ? { background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)', fontFamily: 'Poppins, sans-serif' }
                        : { fontFamily: 'Poppins, sans-serif' }
                    }
                  >
                    {item?.time}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleAvailable}
            className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
            style={btnStyle}
          >
            Continue
          </button>
        </div>
      )}

      {currentState === "otp" && (
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            {sectionLabel("Verify Code")}
            <p className="text-[#B0B0B0] text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              We&apos;ve sent a code to{" "}
              <span className="text-[#C4707E]">{registerData?.email}</span>
            </p>
          </div>

          <InputOTP maxLength={4} value={otp} onChange={(val) => setOtp(val)}>
            <InputOTPGroup className="flex justify-between gap-3 w-full">
              {[0, 1, 2, 3].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="flex-1 h-14 rounded-xl text-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#FFFFFF] focus:border-[#C4707E]"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <button
            onClick={handleOtpSubmit}
            className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
            style={btnStyle}
          >
            Verify & Complete
          </button>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
