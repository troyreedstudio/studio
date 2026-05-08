/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MyFormInput from "@/components/form/MyFormInput";
import MyFormSelect from "@/components/form/MyFormSelect";
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
import { useVerifyRegisterOtpMutation } from "@/redux/features/register/register.api";
import {
  useRegisterMutation,
  useUpdateProfileMutation,
} from "@/redux/features/auth/authApi";
import { setCookie } from "@/utils/cookies";
import { useAppDispatch } from "@/redux/hooks";
import { setUser, TUser } from "@/redux/features/auth/authSlice";
import { varifyToken } from "@/utils/verifyToken";

const btnStyle = {
  background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
  boxShadow: "0 4px 16px rgba(139, 64, 96, 0.25)",
  fontFamily: "Poppins, sans-serif",
};

// Bali areas — matches VenueArea enum on the backend.
const areaOptions = [
  { keyOption: "canggu", label: "Canggu", value: "CANGGU" },
  { keyOption: "seminyak", label: "Seminyak", value: "SEMINYAK" },
  { keyOption: "uluwatu", label: "Uluwatu", value: "ULUWATU" },
  { keyOption: "ubud", label: "Ubud", value: "UBUD" },
];

// Categories — matches VenueCategory enum on the backend. Plain-English
// labels (e.g. "Restaurant" not "RESTAURANT") so applicants don't see
// internal codes.
const categoryOptions = [
  { keyOption: "nightlife", label: "Nightlife / Club / Bar", value: "NIGHTLIFE" },
  { keyOption: "beach_club", label: "Beach Club", value: "BEACH_CLUB" },
  { keyOption: "restaurant", label: "Restaurant", value: "RESTAURANT" },
  { keyOption: "wellness", label: "Wellness / Gym / Fitness", value: "WELLNESS" },
  { keyOption: "events", label: "Events Venue", value: "EVENTS" },
];

const RegisterForm = () => {
  const [currentState, setCurrentState] = useState<"account" | "venue" | "otp">(
    "account"
  );
  const [otp, setOtp] = useState("");
  const [accountData, setAccountData] = useState<any>({});
  const [venueData, setVenueData] = useState<any>({});
  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyRegisterOtpMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Stage 1 → 2: capture name/email/password/phone, hold for venue details.
  const submitAccount = (data: FieldValues) => {
    setAccountData({ ...data, role: "CLUB" });
    setCurrentState("venue");
  };

  // Stage 2 → 3: send full registration to backend, then move to OTP stage.
  // proposedArea + proposedCategory are stored on User and read by
  // provisionApprovedVenuePartner when admin approves the application.
  const submitVenue = async (data: FieldValues) => {
    setVenueData(data);
    try {
      const payload = {
        ...accountData,
        proposedArea: data.proposedArea,
        proposedCategory: data.proposedCategory,
        typeOfVenue: data.proposedCategory, // legacy mirror — keep in sync
        bio: data.bio || "",
      };
      const res = await register(payload).unwrap();
      if (res) setCurrentState("otp");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to register");
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 4) {
      toast.error("Please enter the full 4-digit code");
      return;
    }
    try {
      const res = await verifyOtp({
        email: accountData.email,
        otp: parseInt(otp),
      }).unwrap();
      const user = varifyToken(res.data.accessToken) as TUser;
      if (res) {
        setCookie(res.data.accessToken);
        dispatch(setUser({ user, token: res.data.accessToken }));

        // Upload optional license + hero photo + extra metadata in one shot.
        // updateProfile is multipart/form-data: license (image), profile
        // (image), data (JSON blob with the rest).
        const { license, profile, ...rest } = venueData;
        const formData = new FormData();
        if (license) formData.append("license", license);
        if (profile) formData.append("profile", profile);
        formData.append(
          "data",
          JSON.stringify({
            ...rest,
            fullAddress: venueData.fullAddress || "",
            taxId: venueData.taxId || "",
            isCompleteProfile: true,
          })
        );
        await updateProfile(formData).unwrap();

        toast.success("Application submitted! We'll review within 24 hours.");
        router.push("/login");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to verify code");
    }
  };

  const sectionLabel = (text: string, sub?: string) => (
    <div className="text-center space-y-2">
      <h3
        className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {text}
      </h3>
      {sub && (
        <p
          className="text-[#B0B0B0] text-sm"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {sub}
        </p>
      )}
    </div>
  );

  const stageDots = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(["account", "venue", "otp"] as const).map((s, i) => {
        const order = ["account", "venue", "otp"];
        const currentIndex = order.indexOf(currentState);
        const isDone = i < currentIndex;
        const isCurrent = s === currentState;
        return (
          <div
            key={s}
            className={`h-1 rounded-full transition-all ${
              isCurrent ? "w-8" : "w-4"
            }`}
            style={{
              background:
                isDone || isCurrent
                  ? "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)"
                  : "#2A2A2A",
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-md space-y-6 py-6">
      {stageDots}

      {currentState === "account" && (
        <div className="space-y-8">
          {sectionLabel(
            "Apply to list your venue",
            "Step 1 of 3 — your contact details"
          )}
          <MyFormWrapper onSubmit={submitAccount}>
            <MyFormInput
              name="fullName"
              label="Venue Name"
              placeholder="e.g. Savaya Bali"
            />
            <MyFormInput
              type="email"
              name="email"
              label="Contact Email"
              placeholder="you@yourvenue.com"
            />
            <MyFormInput
              type="password"
              name="password"
              label="Password"
              placeholder="Create a password"
            />
            <MyFormInput
              name="phoneNumber"
              label="Phone"
              placeholder="+62 ..."
            />
            <button
              className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
              style={btnStyle}
            >
              Next
            </button>
          </MyFormWrapper>
        </div>
      )}

      {currentState === "venue" && (
        <div className="space-y-8">
          {sectionLabel("About your venue", "Step 2 of 3 — tell us where and what")}
          <MyFormWrapper onSubmit={submitVenue}>
            <MyFormSelect
              name="proposedArea"
              label="Area"
              options={areaOptions}
            />
            <MyFormSelect
              name="proposedCategory"
              label="Category"
              options={categoryOptions}
            />
            <MyFormInput
              name="fullAddress"
              label="Address"
              placeholder="Street, district, postcode"
            />
            <MyFormInput
              name="bio"
              label="About your venue"
              placeholder="A few sentences about your venue — vibe, food, music, view…"
            />
            <MyFormInput
              name="taxId"
              label="Tax ID (optional)"
              placeholder="NPWP or registration number"
            />
            <MyFormInput
              type="file"
              name="license"
              label="Business License"
              acceptType="image/*"
              filePlaceholder="Upload business licence (verifies your venue)"
            />
            <MyFormInput
              type="file"
              name="profile"
              label="Hero Photo (optional)"
              acceptType="image/*"
              filePlaceholder="Upload one great photo of your venue"
            />

            <button
              disabled={isRegistering}
              className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={btnStyle}
            >
              {isRegistering ? "Submitting…" : "Submit application"}
            </button>
          </MyFormWrapper>
        </div>
      )}

      {currentState === "otp" && (
        <div className="space-y-8">
          {sectionLabel(
            "Verify your email",
            `Step 3 of 3 — we sent a 4-digit code to ${accountData?.email}`
          )}

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
            disabled={isVerifying}
            className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90 disabled:opacity-60"
            style={btnStyle}
          >
            {isVerifying ? "Verifying…" : "Verify & finish"}
          </button>

          <p
            className="text-[11px] text-[#6B6B6B] text-center"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            After verification, we&apos;ll review your application and email
            you within 24 hours.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
