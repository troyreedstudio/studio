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
import PhoneInput from "@/components/forms/PhoneInput";
import AddressAutocomplete, {
  StructuredAddress,
  blankAddress,
  buildAddressString,
} from "@/components/forms/AddressAutocomplete";

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

// Categories — matches VenueCategory enum on the backend. Single canonical
// names: Nightlife covers nightclubs/bars/lounges; Wellness covers gyms/yoga/
// fitness studios. Keeps the application form simple — admin can fine-tune
// the categorisation in /venues/[id] later if needed.
const categoryOptions = [
  { keyOption: "nightlife", label: "Nightlife", value: "NIGHTLIFE" },
  { keyOption: "beach_club", label: "Beach Club", value: "BEACH_CLUB" },
  { keyOption: "restaurant", label: "Restaurant", value: "RESTAURANT" },
  { keyOption: "wellness", label: "Wellness", value: "WELLNESS" },
  { keyOption: "events", label: "Events Venue", value: "EVENTS" },
];

const RegisterForm = () => {
  const [currentState, setCurrentState] = useState<"account" | "venue" | "otp">(
    "account"
  );
  const [otp, setOtp] = useState("");
  const [accountData, setAccountData] = useState<any>({});
  const [venueData, setVenueData] = useState<any>({});

  // Phone uses the country-code-aware PhoneInput, which is a controlled
  // component (not react-hook-form). We hold its state here and inject it
  // into the account payload at submit time.
  const [phone, setPhone] = useState<string>("+62 ");

  // Address uses Google Places autocomplete via the AddressAutocomplete
  // component. Same controlled-state pattern as phone — collected as a
  // structured object, serialised to a single string for the User.fullAddress
  // backend field at submit time.
  const [address, setAddress] = useState<StructuredAddress>(blankAddress());

  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyRegisterOtpMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Stage 1 → 2: capture name/email/password, hold phone from controlled
  // state, then move to venue details.
  const submitAccount = (data: FieldValues) => {
    const cleanedPhone = (phone || "").trim();
    // Require at least country code + a few digits — full validation happens
    // server-side; this is just a sanity check to nudge the user.
    if (cleanedPhone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setAccountData({
      ...data,
      phoneNumber: cleanedPhone,
      role: "CLUB",
    });
    setCurrentState("venue");
  };

  // Stage 2 → 3: send full registration to backend (proposedArea +
  // proposedCategory + structured-address-as-string), then move to OTP stage.
  const submitVenue = async (data: FieldValues) => {
    const composedAddress = buildAddressString(address);
    if (!composedAddress) {
      toast.error("Please pick your address from the suggestions.");
      return;
    }
    const venuePayload = {
      ...data,
      fullAddress: composedAddress,
    };
    setVenueData(venuePayload);
    try {
      const payload = {
        ...accountData,
        proposedArea: data.proposedArea,
        proposedCategory: data.proposedCategory,
        typeOfVenue: data.proposedCategory, // legacy mirror — keep in sync
        bio: data.bio || "",
        fullAddress: composedAddress,
      };
      const res = await register(payload).unwrap();
      if (res) setCurrentState("otp");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to register");
    }
  };

  // OTP submit — split into two phases so failure modes are reportable:
  //   Phase 1: verify the 4-digit code (must succeed to continue).
  //   Phase 2: upload optional metadata (hero photo + extra fields).
  // Phase 2 failure does NOT block the application — the user is already
  // verified server-side, the application emails have fired, and admin can
  // approve. Partner can fill in anything missing in /club/venue later.
  const handleOtpSubmit = async () => {
    if (otp.length !== 4) {
      toast.error("Please enter the full 4-digit code.");
      return;
    }

    let verifyRes: any;
    try {
      verifyRes = await verifyOtp({
        email: accountData.email,
        otp: parseInt(otp),
      }).unwrap();
    } catch (err: any) {
      toast.error(err?.data?.message || "Invalid verification code.");
      return;
    }

    const user = varifyToken(verifyRes.data.accessToken) as TUser;
    setCookie(verifyRes.data.accessToken);
    dispatch(setUser({ user, token: verifyRes.data.accessToken }));

    // Optional profile-upload step — completes the application with hero
    // photo + extra metadata. Failure here is non-fatal (we just warn in
    // console). The application itself is already in the system.
    try {
      const { profile, ...rest } = venueData;
      const formData = new FormData();
      if (profile) formData.append("profile", profile);
      formData.append(
        "data",
        JSON.stringify({
          ...rest,
          taxId: rest.taxId || "",
          isCompleteProfile: true,
        })
      );
      await updateProfile(formData).unwrap();
    } catch (err: any) {
      console.warn(
        "Profile upload after OTP verify failed (non-fatal — application is still submitted):",
        err
      );
    }

    toast.success("Application submitted! We'll review within 24 hours.");
    router.push("/login");
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

  const phoneFieldLabel = (
    <label
      className="mb-2 text-xs text-[#B0B0B0] uppercase tracking-widest block"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      Phone
    </label>
  );

  const addressFieldLabel = (
    <label
      className="mb-2 text-xs text-[#B0B0B0] uppercase tracking-widest block"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      Address
    </label>
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

            <div className="mb-2">
              {phoneFieldLabel}
              <PhoneInput value={phone} onChange={setPhone} />
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

            <div className="mb-2">
              {addressFieldLabel}
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                venueNameHint={accountData?.fullName || ""}
              />
            </div>

            <MyFormInput
              type="textarea"
              name="bio"
              label="About your venue"
              placeholder="A few sentences about your venue — vibe, food, music, view…"
              rows={4}
              required={false}
            />
            <MyFormInput
              name="taxId"
              label="Tax ID (optional)"
              placeholder="NPWP or registration number"
              required={false}
            />
            <MyFormInput
              type="file"
              name="profile"
              label="Hero Photo (optional)"
              acceptType="image/*"
              filePlaceholder="Upload one great photo of your venue"
              required={false}
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
