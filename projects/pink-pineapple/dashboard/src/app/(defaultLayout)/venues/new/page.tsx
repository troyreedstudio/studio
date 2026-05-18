/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Upload, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCreateVenueMutation } from "@/redux/features/venues/venuesApi";
import Image from "next/image";
import AddressAutocomplete, {
  StructuredAddress,
  buildAddressString,
  blankAddress,
} from "@/components/forms/AddressAutocomplete";
import PhoneInput from "@/components/forms/PhoneInput";
import OpeningHoursPicker, {
  OpeningHoursValue,
  blankOpeningHours,
  serializeOpeningHours,
} from "@/components/forms/OpeningHoursPicker";
import BookingSection, {
  BookingValue,
  blankBooking,
} from "@/components/forms/BookingSection";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Outfit, sans-serif" };

// Values must match the Prisma VenueCategory + VenueArea enums.
const venueTypes = [
  { value: "", label: "Select category" },
  { value: "BEACH_CLUB", label: "Beach Club" },
  { value: "NIGHTLIFE", label: "Nightclub / Bar / Lounge" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "WELLNESS", label: "Wellness / Gym" },
  { value: "EVENTS", label: "Events" },
];

const areas = [
  { value: "", label: "Select area" },
  { value: "CANGGU", label: "Canggu" },
  { value: "SEMINYAK", label: "Seminyak" },
  { value: "ULUWATU", label: "Uluwatu" },
  { value: "UBUD", label: "Ubud" },
];

const priceRanges = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

// Mirrors VenueCuisine in backend/prisma/schema.prisma.
const cuisineOptions: { value: string; label: string }[] = [
  { value: "ITALIAN", label: "Italian" },
  { value: "JAPANESE", label: "Japanese" },
  { value: "INDIAN", label: "Indian" },
  { value: "INDONESIAN", label: "Indonesian" },
  { value: "ASIAN_FUSION", label: "Asian Fusion" },
  { value: "MEDITERRANEAN", label: "Mediterranean" },
  { value: "MEXICAN", label: "Mexican" },
  { value: "MIDDLE_EASTERN", label: "Middle Eastern" },
  { value: "FRENCH", label: "French" },
  { value: "STEAKHOUSE", label: "Steakhouse" },
  { value: "SEAFOOD", label: "Seafood" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PIZZA", label: "Pizza" },
  { value: "SUSHI", label: "Sushi" },
  { value: "INTERNATIONAL", label: "International" },
  { value: "CAFE_BRUNCH", label: "Café / Brunch" },
];

// Mirrors VenueMusicGenre in backend/prisma/schema.prisma.
const musicGenreOptions: { value: string; label: string }[] = [
  { value: "EDM", label: "EDM" },
  { value: "HOUSE", label: "House" },
  { value: "DEEP_HOUSE", label: "Deep House" },
  { value: "TECHNO", label: "Techno" },
  { value: "AFRO_HOUSE", label: "Afro House" },
  { value: "HIP_HOP", label: "Hip-Hop" },
  { value: "R_AND_B", label: "R&B" },
  { value: "POP", label: "Pop" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "REGGAETON", label: "Reggaeton" },
  { value: "LATIN", label: "Latin" },
  { value: "LIVE_BAND", label: "Live Band" },
];

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

// Weekly programming — what kind of night each day is. Mirrors the
// admin venue edit page and club portal so the data shape stays
// consistent. Distinct from Opening Hours (when you're open vs what
// you do that night).
const daysOfWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof daysOfWeek)[number];
const dayLabels: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type ProgrammingDay = {
  active: boolean;
  startTime: string;
  endTime: string;
  genre: string;
  description: string;
};

type ProgrammingValue = Record<DayKey, ProgrammingDay>;

const blankProgrammingDay = (): ProgrammingDay => ({
  active: false,
  startTime: "",
  endTime: "",
  genre: "",
  description: "",
});

const blankProgramming = (): ProgrammingValue => ({
  mon: blankProgrammingDay(),
  tue: blankProgrammingDay(),
  wed: blankProgrammingDay(),
  thu: blankProgrammingDay(),
  fri: blankProgrammingDay(),
  sat: blankProgrammingDay(),
  sun: blankProgrammingDay(),
});

const serializeProgramming = (
  v: ProgrammingValue
): Record<string, any> | null => {
  const out: Record<string, any> = {};
  for (const day of daysOfWeek) {
    const d = v[day];
    if (!d.active) continue;
    if (!d.genre.trim()) continue;
    out[day] = {
      startTime: d.startTime || "",
      endTime: d.endTime || "",
      genre: d.genre.trim(),
      description: d.description.trim(),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
};

const NewVenuePage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createVenue, { isLoading }] = useCreateVenueMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    area: "",
    description: "",
    editorial: "",
    website: "",
    instagram: "",
    floorPlanUrl: "",
    priceRange: 2,
  });
  const [address, setAddress] = useState<StructuredAddress>(blankAddress());
  const [phone, setPhone] = useState<string>("+62 ");
  const [openingHours, setOpeningHours] = useState<OpeningHoursValue>(
    blankOpeningHours()
  );
  const [booking, setBooking] = useState<BookingValue>(blankBooking());
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  // Floor plan upload — pushed as a "floorPlan" multipart field on submit,
  // backend uploads to Cloudinary and writes the URL to venue.floorPlanUrl.
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanPreview, setFloorPlanPreview] = useState<string>("");
  // Weekly programming + collapsible-section open state. Both heavy
  // sections start collapsed — admin opens what they need. Mirrors the
  // club portal pattern so the editor and creator feel like one form.
  const [programming, setProgramming] = useState<ProgrammingValue>(
    blankProgramming()
  );
  const [programmingOpen, setProgrammingOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const updateProgrammingDay = (
    day: DayKey,
    patch: Partial<ProgrammingDay>
  ) => {
    setProgramming({
      ...programming,
      [day]: { ...programming[day], ...patch },
    });
  };

  const programmingSummary = useMemo(() => {
    const active = daysOfWeek.filter(
      (d) => programming[d].active && programming[d].genre.trim()
    );
    if (active.length === 0) return "No regular programming yet — tap to add";
    if (active.length === 1) return "1 night programmed";
    return `${active.length} nights programmed`;
  }, [programming]);

  const hoursSummary = useMemo(() => {
    const labels: Record<DayKey, string> = {
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
    };
    const closedDays = daysOfWeek.filter((d) => openingHours[d]?.closed);
    const openCount = 7 - closedDays.length;
    if (openCount === 0) return "Marked closed every day — tap to set";
    if (openCount === 7) return "Open 7 days a week";
    return `Open ${openCount} day${openCount === 1 ? "" : "s"} · Closed ${closedDays
      .map((d) => labels[d])
      .join(", ")}`;
  }, [openingHours]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Venue name is required";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.area) newErrors.area = "Area is required";
    if (!address.street.trim()) newErrors.address = "Street address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const toastId = toast.loading("Creating venue...");
    try {
      // Compose the structured pieces back into the formats the backend
      // already understands: address as a single string, phone as the
      // raw "+CC number" form, openingHours as a JSON map of day → range.
      const fullAddress = buildAddressString(address);
      const formData = new FormData();

      const dataPayload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        area: form.area,
        address: fullAddress,
        priceRange: Number(form.priceRange) || 2,
        openingHours: serializeOpeningHours(openingHours),
      };
      if (form.description) dataPayload.description = form.description;
      if (form.editorial) dataPayload.editorial = form.editorial;
      if (phone.trim()) dataPayload.phone = phone.trim();
      if (form.website) dataPayload.website = form.website;
      if (form.instagram) dataPayload.instagram = form.instagram;
      if (address.latitude != null) dataPayload.latitude = address.latitude;
      if (address.longitude != null) dataPayload.longitude = address.longitude;
      // Booking fields — only send the ones relevant to the chosen provider.
      if (booking.provider) dataPayload.bookingProvider = booking.provider;
      if (booking.url) dataPayload.bookingUrl = booking.url;
      if (booking.phone) dataPayload.bookingPhone = booking.phone;
      if (booking.whatsapp) dataPayload.bookingWhatsapp = booking.whatsapp;
      if (booking.instagram) dataPayload.bookingInstagram = booking.instagram;
      if (booking.dailyUrls && Object.keys(booking.dailyUrls).length > 0) {
        dataPayload.bookingDailyUrls = booking.dailyUrls;
      }
      if (form.floorPlanUrl) dataPayload.floorPlanUrl = form.floorPlanUrl;
      if (cuisines.length > 0) dataPayload.cuisines = cuisines;
      if (musicGenres.length > 0) dataPayload.musicGenres = musicGenres;
      const serializedProgramming = serializeProgramming(programming);
      if (serializedProgramming) {
        dataPayload.weeklySchedule = serializedProgramming;
      }

      formData.append("data", JSON.stringify(dataPayload));
      photos.forEach((photo) => {
        formData.append("photos", photo);
      });
      if (floorPlanFile) {
        formData.append("floorPlan", floorPlanFile);
      }

      await createVenue(formData).unwrap();
      toast.success("Venue created successfully!", { id: toastId });
      router.push("/venues");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create venue", {
        id: toastId,
      });
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...playfair, letterSpacing: "0.02em" }}
        >
          Add New Venue
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          Fill in the details to register a new venue. Use the address search
          to auto-fill location data.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-6">
        {/* Basics */}
        <div className="space-y-5">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Basics
          </h2>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Venue Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Savaya Uluwatu"
              className={`${inputClass} ${
                errors.name ? "border-red-400" : ""
              }`}
              style={inter}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1" style={inter}>
                {errors.name}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Category <span className="text-red-400">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`${inputClass} ${
                  errors.category ? "border-red-400" : ""
                }`}
                style={inter}
              >
                {venueTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-400 text-xs mt-1" style={inter}>
                  {errors.category}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Area <span className="text-red-400">*</span>
              </label>
              <select
                name="area"
                value={form.area}
                onChange={handleChange}
                className={`${inputClass} ${
                  errors.area ? "border-red-400" : ""
                }`}
                style={inter}
              >
                {areas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              {errors.area && (
                <p className="text-red-400 text-xs mt-1" style={inter}>
                  {errors.area}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Address */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Location
          </h2>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            venueNameHint={form.name}
            onVenuePicked={(name) => {
              if (!form.name) setForm({ ...form, name });
            }}
          />
          {errors.address && (
            <p className="text-red-400 text-xs" style={inter}>
              {errors.address}
            </p>
          )}
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Contact */}
        <div className="space-y-5">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Contact
          </h2>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Phone
            </label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Website
              </label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://venue.com"
                className={inputClass}
                style={inter}
              />
            </div>
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Instagram
              </label>
              <input
                type="text"
                name="instagram"
                value={form.instagram}
                onChange={handleChange}
                placeholder="@handle"
                className={inputClass}
                style={inter}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Booking */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Booking
          </h2>
          <p className="text-[11px] text-[#6B6B6B] -mt-1" style={inter}>
            How guests book this venue. We track every &ldquo;Book&rdquo; tap so you can
            show owners how much traffic Pink Pineapple drives.
          </p>
          <BookingSection value={booking} onChange={setBooking} />
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Floor plan */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Floor Plan Image
          </h2>
          <p className="text-[11px] text-[#6B6B6B] -mt-1" style={inter}>
            Optional. Shown to users on the &ldquo;Book VIP Table&rdquo; flow
            so they can pick a specific area (e.g. &ldquo;Daybed D31&rdquo;).
            Upload directly — gets pushed to DigitalOcean Spaces. Recommend
            ~1500px wide JPG.
          </p>

          {/* Preview of selected file */}
          {floorPlanPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={floorPlanPreview}
                alt="Floor plan preview"
                className="max-h-48 rounded-lg border border-[#2A2A2A]"
              />
              <span
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-[#E8A0B0]/20 text-[#E8A0B0] uppercase tracking-wider"
                style={inter}
              >
                Will upload on save
              </span>
            </div>
          )}

          {/* File picker */}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFloorPlanFile(file);
              setFloorPlanPreview(URL.createObjectURL(file));
            }}
            className="block text-xs text-[#B0B0B0] file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-[#2A2A2A] file:bg-[#0A0A0A] file:text-[#E8A0B0] file:cursor-pointer hover:file:border-[#E8A0B0]"
            style={inter}
          />

          {/* Fallback URL field */}
          <input
            type="url"
            name="floorPlanUrl"
            value={form.floorPlanUrl}
            onChange={(e) =>
              setForm({ ...form, floorPlanUrl: e.target.value })
            }
            placeholder="Or paste a URL: https://..."
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#E8A0B0] transition-colors"
            style={inter}
          />
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Cuisine multiselect */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Cuisine
          </h2>
          <p className="text-[11px] text-[#6B6B6B] -mt-1" style={inter}>
            Pick all cuisines this venue serves. Used by the &ldquo;Plan My
            Night&rdquo; filter. Leave empty for venues without food.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cuisineOptions.map((opt) => {
              const selected = cuisines.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setCuisines(
                      selected
                        ? cuisines.filter((x) => x !== opt.value)
                        : [...cuisines, opt.value]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    selected
                      ? "bg-[#E8A0B0]/15 text-[#E8A0B0] border border-[#E8A0B0]/50"
                      : "text-[#6B6B6B] border border-[#2A2A2A] hover:text-[#E8A0B0] hover:border-[#E8A0B0]/40"
                  }`}
                  style={inter}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Music genre multiselect */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Music Genre
          </h2>
          <p className="text-[11px] text-[#6B6B6B] -mt-1" style={inter}>
            Pick all genres this venue regularly plays. Most relevant for
            nightclubs and beach clubs.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {musicGenreOptions.map((opt) => {
              const selected = musicGenres.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setMusicGenres(
                      selected
                        ? musicGenres.filter((x) => x !== opt.value)
                        : [...musicGenres, opt.value]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    selected
                      ? "bg-[#E8A0B0]/15 text-[#E8A0B0] border border-[#E8A0B0]/50"
                      : "text-[#6B6B6B] border border-[#2A2A2A] hover:text-[#E8A0B0] hover:border-[#E8A0B0]/40"
                  }`}
                  style={inter}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Opening hours — collapsible. Mirrors club portal + admin edit
            page so the form feels like a single product. */}
        <section
          className="rounded-xl border bg-[#000000] overflow-hidden transition-colors"
          style={{
            borderColor: hoursOpen ? "#2A2A2A" : "rgba(196,112,126,0.4)",
            background: hoursOpen
              ? "#000000"
              : "linear-gradient(135deg, rgba(139,64,96,0.06), rgba(232,160,176,0.03))",
          }}
        >
          <button
            type="button"
            onClick={() => setHoursOpen(!hoursOpen)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#0A0A0A] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-xs text-[#E8A0B0] uppercase tracking-wider"
                style={inter}
              >
                Opening hours
              </p>
              <p
                className="text-[11px] text-[#B0B0B0] mt-1 truncate"
                style={inter}
              >
                {hoursSummary}
              </p>
            </div>
            <span
              className="flex items-center gap-1.5 flex-shrink-0 text-[10px] uppercase tracking-wider text-[#E8A0B0]"
              style={inter}
            >
              {hoursOpen ? "Hide" : "Edit"}
              <ChevronDown
                size={16}
                className="text-[#E8A0B0] transition-transform"
                style={{
                  transform: hoursOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </span>
          </button>
          {hoursOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#1A1A1A] pt-4">
              <p className="text-[11px] text-[#6B6B6B]" style={inter}>
                Pick the days you want to apply hours to, then tap a preset.
                You can fine-tune any individual day below.
              </p>
              <OpeningHoursPicker
                value={openingHours}
                onChange={setOpeningHours}
              />
            </div>
          )}
        </section>

        <div className="border-t border-[#2A2A2A]" />

        {/* Weekly programming — collapsible. Same pattern as Opening hours
            above. Each day has its own active toggle that reveals the
            genre / start / end / description inputs when flipped on. */}
        <section
          className="rounded-xl border bg-[#000000] overflow-hidden transition-colors"
          style={{
            borderColor: programmingOpen
              ? "#2A2A2A"
              : "rgba(196,112,126,0.4)",
            background: programmingOpen
              ? "#000000"
              : "linear-gradient(135deg, rgba(139,64,96,0.06), rgba(232,160,176,0.03))",
          }}
        >
          <button
            type="button"
            onClick={() => setProgrammingOpen(!programmingOpen)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#0A0A0A] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-xs text-[#E8A0B0] uppercase tracking-wider"
                style={inter}
              >
                Weekly programming
              </p>
              <p
                className="text-[11px] text-[#B0B0B0] mt-1 truncate"
                style={inter}
              >
                {programmingSummary}
              </p>
            </div>
            <span
              className="flex items-center gap-1.5 flex-shrink-0 text-[10px] uppercase tracking-wider text-[#E8A0B0]"
              style={inter}
            >
              {programmingOpen ? "Hide" : "Edit"}
              <ChevronDown
                size={16}
                className="text-[#E8A0B0] transition-transform"
                style={{
                  transform: programmingOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </span>
          </button>
          {programmingOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#1A1A1A] pt-4">
              <p
                className="text-[11px] text-[#6B6B6B] max-w-xl"
                style={inter}
              >
                What kind of night each day is — e.g.{" "}
                <span className="text-[#E8A0B0]">Hip Hop Wednesday</span>,
                <span className="text-[#E8A0B0]"> Open Decks Saturday</span>.
                Toggle on the days with regular programming. Powers the
                consumer app&apos;s &ldquo;This Week&rdquo; carousel.
              </p>
              <div className="space-y-2">
                {daysOfWeek.map((day) => {
                  const d = programming[day];
                  return (
                    <div
                      key={day}
                      className="rounded-xl border bg-[#0A0A0A] overflow-hidden transition-colors"
                      style={{
                        borderColor: d.active
                          ? "rgba(196,112,126,0.4)"
                          : "#2A2A2A",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateProgrammingDay(day, { active: !d.active })
                        }
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="text-sm font-medium w-24"
                            style={{
                              ...inter,
                              color: d.active ? "#FFFFFF" : "#B0B0B0",
                            }}
                          >
                            {dayLabels[day]}
                          </span>
                          {d.active && d.genre ? (
                            <span
                              className="text-sm text-[#E8A0B0]"
                              style={inter}
                            >
                              {d.genre}
                            </span>
                          ) : !d.active ? (
                            <span
                              className="text-xs text-[#6B6B6B]"
                              style={inter}
                            >
                              No regular programming
                            </span>
                          ) : (
                            <span
                              className="text-xs text-[#6B6B6B] italic"
                              style={inter}
                            >
                              Add details below
                            </span>
                          )}
                        </span>
                        <span
                          className={`flex-shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
                            d.active ? "bg-[#C4707E]" : "bg-[#2A2A2A]"
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              d.active ? "translate-x-4" : ""
                            }`}
                          />
                        </span>
                      </button>

                      {d.active && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#1A1A1A]">
                          <div>
                            <label
                              className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1.5"
                              style={inter}
                            >
                              Night name / genre{" "}
                              <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={d.genre}
                              onChange={(e) =>
                                updateProgrammingDay(day, {
                                  genre: e.target.value,
                                })
                              }
                              placeholder="e.g. Hip Hop Night"
                              className={inputClass}
                              style={inter}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label
                                className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1.5"
                                style={inter}
                              >
                                Start
                              </label>
                              <input
                                type="time"
                                value={d.startTime}
                                onChange={(e) =>
                                  updateProgrammingDay(day, {
                                    startTime: e.target.value,
                                  })
                                }
                                className={inputClass}
                                style={inter}
                              />
                            </div>
                            <div>
                              <label
                                className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1.5"
                                style={inter}
                              >
                                End
                              </label>
                              <input
                                type="time"
                                value={d.endTime}
                                onChange={(e) =>
                                  updateProgrammingDay(day, {
                                    endTime: e.target.value,
                                  })
                                }
                                className={inputClass}
                                style={inter}
                              />
                            </div>
                          </div>
                          <div>
                            <label
                              className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1.5"
                              style={inter}
                            >
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              value={d.description}
                              onChange={(e) =>
                                updateProgrammingDay(day, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="e.g. Resident DJs spinning hip hop, R&amp;B, and trap"
                              className={inputClass}
                              style={inter}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="border-t border-[#2A2A2A]" />

        {/* Story */}
        <div className="space-y-5">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Story
          </h2>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="One-line summary of the venue (used on cards)"
              rows={2}
              className={inputClass + " resize-none"}
              style={inter}
            />
          </div>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Editorial
            </label>
            <textarea
              name="editorial"
              value={form.editorial}
              onChange={handleChange}
              placeholder="Longer-form editorial write-up (Pink Pineapple's voice)"
              rows={4}
              className={inputClass + " resize-none"}
              style={inter}
            />
          </div>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Price Range
            </label>
            <div className="flex gap-2">
              {priceRanges.map((pr) => (
                <button
                  key={pr.value}
                  type="button"
                  onClick={() => setForm({ ...form, priceRange: pr.value })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    form.priceRange === pr.value
                      ? "text-[#FFFFFF] border-[#C4707E]"
                      : "text-[#6B6B6B] border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A]"
                  }`}
                  style={
                    form.priceRange === pr.value
                      ? {
                          ...inter,
                          background:
                            "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                        }
                      : inter
                  }
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Photos */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Photos
          </h2>
          <p className="text-[11px] text-[#6B6B6B]" style={inter}>
            First image becomes the hero on the venue card. You can change
            this later from the venue edit page.
          </p>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((preview, i) => (
                <div
                  key={i}
                  className="relative group rounded-lg overflow-hidden h-24"
                >
                  <Image
                    src={preview}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-[#000000]/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                  {i === 0 && (
                    <span
                      className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-[#8B4060]/80 text-white"
                      style={inter}
                    >
                      Hero
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-8 text-center hover:border-[#C4707E]/40 transition-colors cursor-pointer"
          >
            <Upload size={24} className="text-[#C4707E] mx-auto mb-2" />
            <p className="text-[#B0B0B0] text-sm" style={inter}>
              Drag & drop images here, or click to browse
            </p>
            <p className="text-[#6B6B6B] text-xs mt-1" style={inter}>
              PNG, JPG up to 5MB.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              ...inter,
              background:
                "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            {isLoading ? "Creating..." : "Create Venue"}
          </button>
          <Link
            href="/venues"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#B0B0B0] border border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all duration-200"
            style={inter}
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewVenuePage;
