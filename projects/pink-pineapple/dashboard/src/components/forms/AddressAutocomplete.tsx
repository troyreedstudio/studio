/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

export type StructuredAddress = {
  street: string;
  city: string;
  postcode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formatted: string;
};

type Suggestion = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: StructuredAddress;
  onChange: (next: StructuredAddress) => void;
  /// Optional venue name — pre-fills the search to help the user find their place.
  venueNameHint?: string;
  /// If a venue picked from the dropdown should ALSO update the parent's name field.
  onVenuePicked?: (name: string) => void;
};

const empty: StructuredAddress = {
  street: "",
  city: "",
  postcode: "",
  country: "Indonesia",
  formatted: "",
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const parseFormatted = (
  formatted: string
): { street: string; city: string; postcode: string; country: string } => {
  // Google's formattedAddress in Indonesia typically looks like:
  //   "Jl. Petitenget No.51B, Kerobokan Kelod, Kec. Kuta Utara, Kabupaten Badung, Bali 80361, Indonesia"
  // Pull out the 5-digit Indonesian postcode and the country, then keep
  // the remainder as the street + city (best-effort, user can edit).
  const parts = formatted.split(",").map((p) => p.trim()).filter(Boolean);
  let postcode = "";
  let country = "Indonesia";
  // Postcode = trailing 5 digits in any segment
  for (const p of parts) {
    const m = p.match(/\b(\d{5})\b/);
    if (m) {
      postcode = m[1];
      break;
    }
  }
  if (parts.length >= 1) {
    country = parts[parts.length - 1];
  }
  // Street = first segment, city = collapse the middle bits
  const street = parts[0] ?? "";
  const middle = parts.slice(1, -1);
  // Drop the segment that contains the postcode from the city collapse
  const city = middle
    .filter((p) => !/\b\d{5}\b/.test(p))
    .slice(-2)
    .join(", ");
  return { street, city, postcode, country };
};

const AddressAutocomplete = ({
  value,
  onChange,
  venueNameHint,
  onVenuePicked,
}: Props) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${baseUrl}/places/search?searchTerm=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setSuggestions(
            json.data.slice(0, 6).map((p: any) => ({
              id: String(p.id),
              name: String(p.name || ""),
              address: String(p.address || ""),
              latitude: Number(p.latitude || 0),
              longitude: Number(p.longitude || 0),
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (s: Suggestion) => {
    const parts = parseFormatted(s.address);
    const next: StructuredAddress = {
      ...parts,
      latitude: s.latitude || undefined,
      longitude: s.longitude || undefined,
      formatted: s.address,
    };
    onChange(next);
    setQuery(s.name);
    if (onVenuePicked) onVenuePicked(s.name);
    setOpen(false);
  };

  const updateField = (key: keyof StructuredAddress, val: string) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <label
          className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
          style={inter}
        >
          Search venue or address
        </label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay so a click on a suggestion can fire first.
              blurTimeoutRef.current = setTimeout(() => setOpen(false), 200);
            }}
            placeholder={
              venueNameHint
                ? `Search "${venueNameHint}" or paste an address`
                : "Try a venue name or street, e.g. Jl. Petitenget"
            }
            className={inputClass + " pl-10"}
            style={inter}
          />
        </div>
        {open && (suggestions.length > 0 || loading) && (
          <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] shadow-xl overflow-hidden">
            {loading && (
              <div
                className="px-4 py-3 text-xs text-[#6B6B6B]"
                style={inter}
              >
                Searching…
              </div>
            )}
            {!loading &&
              suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => pick(s)}
                  className="w-full text-left px-4 py-3 hover:bg-[#1A1A1A] transition-colors border-b border-[#2A2A2A] last:border-b-0"
                  style={inter}
                >
                  <div className="text-sm text-white font-medium flex items-center gap-2">
                    <MapPin size={12} className="text-[#C4707E] flex-shrink-0" />
                    {s.name || "(no name)"}
                  </div>
                  <div className="text-[11px] text-[#6B6B6B] mt-0.5 ml-5">
                    {s.address}
                  </div>
                </button>
              ))}
          </div>
        )}
        <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
          Powered by Google Places. Pick a result to auto-fill the fields below.
        </p>
      </div>

      {/* Structured fields — editable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label
            className="block text-[10px] text-[#B0B0B0] uppercase tracking-wider mb-1.5"
            style={inter}
          >
            Street Address
          </label>
          <input
            type="text"
            value={value.street}
            onChange={(e) => updateField("street", e.target.value)}
            placeholder="Jl. Petitenget No.51B"
            className={inputClass}
            style={inter}
          />
        </div>
        <div>
          <label
            className="block text-[10px] text-[#B0B0B0] uppercase tracking-wider mb-1.5"
            style={inter}
          >
            City / Suburb
          </label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Kerobokan, Kuta Utara"
            className={inputClass}
            style={inter}
          />
        </div>
        <div>
          <label
            className="block text-[10px] text-[#B0B0B0] uppercase tracking-wider mb-1.5"
            style={inter}
          >
            Postcode
          </label>
          <input
            type="text"
            value={value.postcode}
            onChange={(e) =>
              updateField("postcode", e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="80361"
            inputMode="numeric"
            maxLength={5}
            className={inputClass}
            style={inter}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className="block text-[10px] text-[#B0B0B0] uppercase tracking-wider mb-1.5"
            style={inter}
          >
            Country
          </label>
          <input
            type="text"
            value={value.country}
            onChange={(e) => updateField("country", e.target.value)}
            placeholder="Indonesia"
            className={inputClass}
            style={inter}
          />
        </div>
      </div>

      {value.latitude != null && value.longitude != null && (
        <p className="text-[10px] text-[#6B6B6B]" style={inter}>
          📍 Coordinates: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export const buildAddressString = (a: StructuredAddress): string => {
  // Reassemble into the single-string format the backend currently stores.
  return [a.street, a.city, a.postcode, a.country]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(", ");
};

export const blankAddress = (): StructuredAddress => ({ ...empty });

export default AddressAutocomplete;
