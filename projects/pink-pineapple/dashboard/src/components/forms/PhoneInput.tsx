"use client";

import { useState, useMemo } from "react";

const inter = { fontFamily: "Inter, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

// Country codes most likely for Bali venues — Indonesia first, then the
// expat-heavy senders. Keep the list short on purpose; "Other" lets the
// user type any code.
const COMMON_CODES: { code: string; flag: string; label: string }[] = [
  { code: "+62", flag: "🇮🇩", label: "Indonesia" },
  { code: "+65", flag: "🇸🇬", label: "Singapore" },
  { code: "+60", flag: "🇲🇾", label: "Malaysia" },
  { code: "+66", flag: "🇹🇭", label: "Thailand" },
  { code: "+61", flag: "🇦🇺", label: "Australia" },
  { code: "+44", flag: "🇬🇧", label: "United Kingdom" },
  { code: "+1", flag: "🇺🇸", label: "USA / Canada" },
  { code: "+33", flag: "🇫🇷", label: "France" },
  { code: "+49", flag: "🇩🇪", label: "Germany" },
  { code: "+81", flag: "🇯🇵", label: "Japan" },
];

type Props = {
  /// Full phone number including the country code (what the backend stores).
  value: string;
  onChange: (next: string) => void;
};

const splitPhone = (full: string): { code: string; number: string } => {
  const trimmed = (full || "").trim();
  if (!trimmed) return { code: "+62", number: "" };
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { code: match[1], number: match[2].trim() };
  }
  // Doesn't start with + — assume Indonesia and store as-is in the number part.
  return { code: "+62", number: trimmed.replace(/^0+/, "") };
};

const PhoneInput = ({ value, onChange }: Props) => {
  const initial = useMemo(() => splitPhone(value), [value]);
  const [code, setCode] = useState(initial.code);
  const [number, setNumber] = useState(initial.number);

  const knownCode = COMMON_CODES.some((c) => c.code === code);
  const [customCode, setCustomCode] = useState(knownCode ? "" : code);

  const update = (newCode: string, newNumber: string) => {
    setCode(newCode);
    setNumber(newNumber);
    const cleaned = newNumber.replace(/^0+/, "").trim();
    onChange(cleaned ? `${newCode} ${cleaned}` : "");
  };

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={knownCode ? code : "OTHER"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "OTHER") {
              update(customCode || "+", number);
            } else {
              setCustomCode("");
              update(v, number);
            }
          }}
          className={inputClass + " w-32 sm:w-44"}
          style={inter}
        >
          {COMMON_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} {c.label}
            </option>
          ))}
          <option value="OTHER">Other…</option>
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) =>
            update(code, e.target.value.replace(/[^\d\s\-()]/g, ""))
          }
          placeholder="812 3456 7890"
          className={inputClass + " flex-1"}
          style={inter}
        />
      </div>
      {!knownCode && (
        <input
          type="text"
          value={customCode}
          onChange={(e) => {
            const next = e.target.value
              .replace(/[^+\d]/g, "")
              .replace(/^(?!\+)/, "+");
            setCustomCode(next);
            update(next, number);
          }}
          placeholder="Custom country code, e.g. +853"
          className={inputClass + " mt-2"}
          style={inter}
        />
      )}
      <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
        Indonesian numbers — drop the leading 0 (e.g. 0812… becomes +62 812…).
      </p>
    </div>
  );
};

export default PhoneInput;
