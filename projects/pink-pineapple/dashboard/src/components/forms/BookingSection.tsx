/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

export type BookingProvider =
  | "BOOKETING"
  | "MTIX"
  | "CROWDSTACK"
  | "OPENTABLE"
  | "RESY"
  | "RESDIARY"
  | "TOAST"
  | "SEVENROOMS"
  | "CUSTOM_WEB"
  | "PHONE"
  | "WHATSAPP"
  | "INSTAGRAM_DM"
  | "NONE"
  | "";

export type BookingValue = {
  provider: BookingProvider;
  url: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  dailyUrls: Record<string, string> | null;
};

export const blankBooking = (): BookingValue => ({
  provider: "",
  url: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  dailyUrls: null,
});

const PROVIDER_OPTIONS: {
  value: BookingProvider;
  label: string;
  group: "online" | "contact" | "none";
  hint?: string;
}[] = [
  { value: "", label: "Select booking system…", group: "none" },
  { value: "BOOKETING", label: "Booketing (Indonesia)", group: "online" },
  { value: "MTIX", label: "Mtix (Indonesia)", group: "online" },
  { value: "CROWDSTACK", label: "Crowdstack", group: "online" },
  { value: "OPENTABLE", label: "OpenTable", group: "online" },
  { value: "RESY", label: "Resy", group: "online" },
  { value: "RESDIARY", label: "Resdiary", group: "online" },
  { value: "TOAST", label: "Toast", group: "online" },
  { value: "SEVENROOMS", label: "SevenRooms", group: "online" },
  { value: "CUSTOM_WEB", label: "Custom website / form", group: "online" },
  { value: "PHONE", label: "Phone only (call to book)", group: "contact" },
  { value: "WHATSAPP", label: "WhatsApp only", group: "contact" },
  { value: "INSTAGRAM_DM", label: "Instagram DM only", group: "contact" },
  { value: "NONE", label: "Walk-in only — no booking", group: "none" },
];

const isOnline = (p: BookingProvider) =>
  PROVIDER_OPTIONS.find((o) => o.value === p)?.group === "online";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type Props = {
  value: BookingValue;
  onChange: (next: BookingValue) => void;
};

const BookingSection = ({ value, onChange }: Props) => {
  const [showDaily, setShowDaily] = useState<boolean>(
    !!value.dailyUrls && Object.values(value.dailyUrls).some((v) => v)
  );

  const set = <K extends keyof BookingValue>(key: K, v: BookingValue[K]) => {
    onChange({ ...value, [key]: v });
  };

  const setDaily = (day: string, url: string) => {
    const next = { ...(value.dailyUrls || {}) };
    if (url) next[day] = url;
    else delete next[day];
    onChange({
      ...value,
      dailyUrls: Object.keys(next).length > 0 ? next : null,
    });
  };

  const provider = value.provider;
  const showUrl = isOnline(provider);
  const showPhone = provider === "PHONE";
  const showWhatsapp = provider === "WHATSAPP";
  const showInstagram = provider === "INSTAGRAM_DM";
  const showNothing = provider === "NONE" || provider === "";

  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
          style={inter}
        >
          Booking System
        </label>
        <select
          value={provider}
          onChange={(e) => set("provider", e.target.value as BookingProvider)}
          className={inputClass}
          style={inter}
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
          What system the venue uses for reservations. We track every &ldquo;Book&rdquo;
          tap so you can show venues how much traffic Pink Pineapple drives.
        </p>
      </div>

      {showUrl && (
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            Booking URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={value.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://booketing.com/savaya"
            className={inputClass}
            style={inter}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[#6B6B6B]" style={inter}>
              We&apos;ll append <code className="text-[#E8A0B0]">utm_source=pinkpineapple</code> to track attribution.
            </p>
            {value.url && (
              <a
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-[#E8A0B0] hover:underline"
                style={inter}
              >
                <ExternalLink size={10} />
                Test link
              </a>
            )}
          </div>
        </div>
      )}

      {showPhone && (
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            Booking Phone Number
          </label>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+62 812 3456 7890"
            className={inputClass}
            style={inter}
          />
          <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
            Tapping &ldquo;Book&rdquo; in the app will open the phone dialer with this number.
          </p>
        </div>
      )}

      {showWhatsapp && (
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={value.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+62 812 3456 7890"
            className={inputClass}
            style={inter}
          />
          <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
            Opens a WhatsApp chat to this number when the user taps &ldquo;Book&rdquo;.
          </p>
        </div>
      )}

      {showInstagram && (
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            Instagram Handle
          </label>
          <input
            type="text"
            value={value.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="@savayabali"
            className={inputClass}
            style={inter}
          />
          <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
            Opens Instagram DM to this handle when the user taps &ldquo;Book&rdquo;.
          </p>
        </div>
      )}

      {showNothing && (
        <p
          className="text-xs text-[#6B6B6B] italic px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]"
          style={inter}
        >
          No booking flow — the venue card will show the venue details but
          won&apos;t have a &ldquo;Book&rdquo; button. Choose a different system above to enable bookings.
        </p>
      )}

      {/* Per-day URL routing — advanced, collapsed by default */}
      {showUrl && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDaily(!showDaily)}
            className="flex items-center gap-1.5 text-xs text-[#E8A0B0] hover:text-white transition-colors"
            style={inter}
          >
            {showDaily ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Per-day URLs (advanced)
          </button>
          {showDaily && (
            <div className="mt-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2">
              <p className="text-[11px] text-[#6B6B6B]" style={inter}>
                Override the main URL on specific days. Leave blank to use the
                main URL above. Useful for venues like Mesa that route to
                different ticketing pages depending on the night.
              </p>
              {DAYS.map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span
                    className="text-xs text-white font-medium w-20"
                    style={inter}
                  >
                    {d.label}
                  </span>
                  <input
                    type="url"
                    value={(value.dailyUrls || {})[d.key] || ""}
                    onChange={(e) => setDaily(d.key, e.target.value)}
                    placeholder="(uses main URL)"
                    className={inputClass + " flex-1 py-2 text-xs"}
                    style={inter}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingSection;
