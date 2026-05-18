/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetVenueQuery,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
  useGetVenueStatsQuery,
} from "@/redux/features/venues/venuesApi";
import { useAllEventsQuery } from "@/redux/features/events/events.spi";
import Spinner from "@/components/common/Spinner";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
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
  parseOpeningHours,
} from "@/components/forms/OpeningHoursPicker";
import BookingSection, {
  BookingValue,
  BookingProvider,
  blankBooking,
} from "@/components/forms/BookingSection";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Star,
  Pencil,
  Trash2,
  Upload,
  X,
  Save,
  Globe,
  Phone,
  Instagram,
  Heart,
  Activity,
  Plus,
} from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

const venueTypes = [
  { value: "BEACH_CLUB", label: "Beach Club" },
  { value: "NIGHTLIFE", label: "Nightclub" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "WELLNESS", label: "Wellness" },
  { value: "EVENTS", label: "Events" },
];

const areaOptions = [
  { value: "CANGGU", label: "Canggu" },
  { value: "SEMINYAK", label: "Seminyak" },
  { value: "ULUWATU", label: "Uluwatu" },
  { value: "UBUD", label: "Ubud" },
];

const tagOptions = [
  "beach_club",
  "nightlife",
  "restaurant",
  "bar",
  "lounge",
  "wellness",
  "gym",
];

// Enum-driven multiselect options. Mirrors VenueCuisine + VenueMusicGenre
// in backend/prisma/schema.prisma. Labels are display-friendly; values
// are the canonical enum strings that get sent to the API.
const cuisineOptions: { value: string; label: string }[] = [
  { value: "ITALIAN", label: "Italian" },
  { value: "JAPANESE", label: "Japanese" },
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

type ScheduleEntry = {
  startTime?: string;
  endTime?: string;
  genre?: string;
  description?: string;
};

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

const crowdShort = ["Empty", "Chill", "Filling", "Packed", "Capped"];
const musicShort = ["Silent", "Background", "Good", "Great", "Incredible"];
const energyShort = ["Dead", "Mellow", "Warming", "Lit", "Fire"];

const formatRelative = (iso?: string) => {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const VenueDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetVenueQuery(id);
  const { data: statsData } = useGetVenueStatsQuery(id, { skip: !id });
  const [updateVenue, { isLoading: isUpdating }] = useUpdateVenueMutation();
  const [deleteVenue] = useDeleteVenueMutation();

  const venue = data?.data;
  const stats = statsData?.data;

  const { data: eventsData, isLoading: eventsLoading } = useAllEventsQuery([
    { name: "limit", value: 10 },
    { name: "page", value: "1" },
    { name: "clubId", value: id },
  ]);
  const events = eventsData?.data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    area: "",
    address: "",
    description: "",
    editorial: "",
    phone: "",
    website: "",
    instagram: "",
    bookingUrl: "",
    floorPlanUrl: "",
    priceRange: 2,
    openingHours: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Record<DayKey, ScheduleEntry>>({
    mon: {},
    tue: {},
    wed: {},
    thu: {},
    fri: {},
    sat: {},
    sun: {},
  });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  // Existing gallery photos in their current order (with deletions applied).
  // Initialized from venue.photos when the venue loads. Sent back as the
  // canonical photos array on save — the backend appends any newly-uploaded
  // files after these.
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  // Hero image URL — either an existing photo URL or pending new upload.
  // Initialized from venue.heroImage. Saved back on submit.
  const [heroImage, setHeroImage] = useState<string>("");
  // Structured form state for the new components — kept in sync with the
  // legacy `form` flat state so the existing Save handler still works.
  const [address, setAddress] = useState<StructuredAddress>(blankAddress());
  const [phone, setPhone] = useState<string>("+62 ");
  const [openingHours, setOpeningHours] = useState<OpeningHoursValue>(
    blankOpeningHours()
  );
  const [booking, setBooking] = useState<BookingValue>(blankBooking());

  useEffect(() => {
    if (venue) {
      setForm({
        name: venue.name || venue.fullName || "",
        category: venue.category || venue.typeOfVenue || "",
        area: venue.area || "",
        address: venue.address || venue.fullAddress || "",
        description: venue.description || venue.bio || "",
        editorial: venue.editorial || "",
        phone: venue.phone || venue.phoneNumber || "",
        website: venue.website || "",
        instagram: venue.instagram || "",
        bookingUrl: venue.bookingUrl || "",
        floorPlanUrl: venue.floorPlanUrl || "",
        priceRange: venue.priceRange || 2,
        openingHours:
          typeof venue.openingHours === "string"
            ? venue.openingHours
            : venue.openingHours
              ? JSON.stringify(venue.openingHours)
              : "",
      });
      setTags(Array.isArray(venue.tags) ? venue.tags : []);
      setCuisines(Array.isArray(venue.cuisines) ? venue.cuisines : []);
      setMusicGenres(
        Array.isArray(venue.musicGenres) ? venue.musicGenres : []
      );
      setExistingPhotos(Array.isArray(venue.photos) ? venue.photos : []);
      setHeroImage(venue.heroImage || "");

      // Hydrate the new structured components from the venue's stored shape.
      // Address: best-effort split of the single string back into parts.
      setAddress({
        street: venue.address || "",
        city: "",
        postcode: "",
        country: "Indonesia",
        latitude: typeof venue.latitude === "number" ? venue.latitude : undefined,
        longitude:
          typeof venue.longitude === "number" ? venue.longitude : undefined,
        formatted: venue.address || "",
      });
      setPhone(venue.phone || "+62 ");
      setOpeningHours(parseOpeningHours(venue.openingHours));
      setBooking({
        provider: (venue.bookingProvider || "") as BookingProvider,
        url: venue.bookingUrl || "",
        phone: venue.bookingPhone || "",
        whatsapp: venue.bookingWhatsapp || "",
        instagram: venue.bookingInstagram || "",
        dailyUrls:
          venue.bookingDailyUrls &&
          typeof venue.bookingDailyUrls === "object"
            ? (venue.bookingDailyUrls as Record<string, string>)
            : null,
      });
      const fresh: Record<DayKey, ScheduleEntry> = {
        mon: {},
        tue: {},
        wed: {},
        thu: {},
        fri: {},
        sat: {},
        sun: {},
      };
      const ws = venue.weeklySchedule;
      if (ws && typeof ws === "object") {
        for (const day of daysOfWeek) {
          if (ws[day] && typeof ws[day] === "object") {
            fresh[day] = {
              startTime: ws[day].startTime || "",
              endTime: ws[day].endTime || "",
              genre: ws[day].genre || "",
              description: ws[day].description || "",
            };
          }
        }
      }
      setSchedule(fresh);
    }
  }, [venue]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const updateSchedule = (
    day: DayKey,
    key: keyof ScheduleEntry,
    value: string
  ) => {
    setSchedule({
      ...schedule,
      [day]: { ...schedule[day], [key]: value },
    });
  };

  const clearScheduleDay = (day: DayKey) => {
    setSchedule({ ...schedule, [day]: {} });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (!t) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagDraft("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewPhotos([...newPhotos, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewPreviews([...newPreviews, ...previews]);
  };

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
    setNewPreviews(newPreviews.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const toastId = toast.loading("Updating venue...");
    try {
      // Build clean weeklySchedule, dropping empty days
      const cleanSchedule: Record<string, ScheduleEntry> = {};
      for (const day of daysOfWeek) {
        const entry = schedule[day];
        const hasContent = entry.startTime || entry.endTime || entry.genre || entry.description;
        if (hasContent) cleanSchedule[day] = entry;
      }

      // Address: prefer the structured form's serialized string when the
      // user actually picked or edited it; fall back to the legacy text input.
      const structuredAddress = buildAddressString(address);
      const finalAddress = structuredAddress || form.address;

      const payload: Record<string, unknown> = {
        name: form.name || undefined,
        category: form.category || undefined,
        area: form.area || undefined,
        address: finalAddress,
        description: form.description,
        editorial: form.editorial,
        phone: phone.trim() || form.phone,
        website: form.website,
        instagram: form.instagram,
        bookingUrl: booking.url || form.bookingUrl,
        floorPlanUrl: form.floorPlanUrl,
        // New booking fields — provider determines which contact field matters.
        bookingProvider: booking.provider || undefined,
        bookingPhone: booking.phone || undefined,
        bookingWhatsapp: booking.whatsapp || undefined,
        bookingInstagram: booking.instagram || undefined,
        bookingDailyUrls:
          booking.dailyUrls && Object.keys(booking.dailyUrls).length > 0
            ? booking.dailyUrls
            : null,
        // Lat/lng from address autocomplete if the user picked a place.
        ...(address.latitude != null ? { latitude: address.latitude } : {}),
        ...(address.longitude != null ? { longitude: address.longitude } : {}),
        priceRange: Number(form.priceRange) || 2,
        openingHours: serializeOpeningHours(openingHours),
        tags,
        cuisines,
        musicGenres,
        weeklySchedule: Object.keys(cleanSchedule).length > 0 ? cleanSchedule : null,
        // Send the (possibly trimmed) existing-photo array — backend will
        // append any newly-uploaded files after these. Lets users delete
        // existing photos by removing them from this array.
        photos: existingPhotos,
        heroImage: heroImage,
      };

      // Drop empty/undefined keys to satisfy the strict zod validation
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      // If the user added new photos, ship as multipart/form-data with
      // a `data` JSON field. Otherwise send plain JSON.
      let body: FormData | typeof payload;
      if (newPhotos.length > 0) {
        const fd = new FormData();
        fd.append("data", JSON.stringify(payload));
        newPhotos.forEach((p) => fd.append("photos", p));
        body = fd;
      } else {
        body = payload;
      }

      await updateVenue({ id, data: body }).unwrap();
      toast.success("Venue updated!", { id: toastId });
      setEditing(false);
      setNewPhotos([]);
      setNewPreviews([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update venue", {
        id: toastId,
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this venue? This cannot be undone.")) return;
    const toastId = toast.loading("Deleting venue...");
    try {
      await deleteVenue(id).unwrap();
      toast.success("Venue deleted", { id: toastId });
      router.push("/venues");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete venue", {
        id: toastId,
      });
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!venue) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#B0B0B0] text-sm" style={inter}>
          Venue not found.
        </p>
        <Link
          href="/venues"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            ...inter,
          }}
        >
          Back to Venues
        </Link>
      </div>
    );
  }

  const displayHero =
    venue.heroImage || venue.photos?.[0] || venue.profileImage;
  const gallery = venue.photos || [];
  const venueName = venue.name || venue.fullName || "N/A";

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/venues"
        className="inline-flex items-center gap-2 text-[#B0B0B0] hover:text-[#FFFFFF] transition-colors text-sm"
        style={inter}
      >
        <ArrowLeft size={16} />
        Back to Venues
      </Link>

      {/* Hero + Header Card */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] overflow-hidden">
        {/* Hero Image */}
        {displayHero && !editing && (
          <div className="relative h-56 sm:h-72 bg-[#1A1A1A]">
            <Image
              src={displayHero}
              alt={venueName}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] to-transparent" />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {editing ? (
            /* ---- EDIT MODE ---- */
            <div className="space-y-5">
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Venue Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  style={inter}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                    style={inter}
                  >
                    Category
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className={inputClass}
                    style={inter}
                  >
                    <option value="">Select</option>
                    {venueTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                    style={inter}
                  >
                    Area
                  </label>
                  <select
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    className={inputClass}
                    style={inter}
                  >
                    <option value="">Select</option>
                    {areaOptions.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Location
                </label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  venueNameHint={form.name}
                />
              </div>

              {/* Tags editor */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Tags
                </label>
                <p className="text-[#6B6B6B] text-xs mb-2" style={inter}>
                  Cross-category tags. e.g. add{" "}
                  <span className="text-[#E8A0B0]">nightlife</span> to a beach
                  club like Savaya so it appears in both sections.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-[#E8A0B0] bg-[#E8A0B0]/10 border border-[#E8A0B0]/30"
                      style={inter}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-white"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-[#6B6B6B] text-xs" style={inter}>
                      No tags yet
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagDraft);
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    className={inputClass + " flex-1 min-w-[200px]"}
                    style={inter}
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagDraft)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#C4707E] border border-[#C4707E]/40 hover:border-[#C4707E] hover:bg-[#C4707E]/5 transition-all"
                    style={inter}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tagOptions
                    .filter((opt) => !tags.includes(opt))
                    .map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => addTag(opt)}
                        className="px-2.5 py-1 rounded-full text-[10px] text-[#6B6B6B] border border-[#2A2A2A] hover:text-[#E8A0B0] hover:border-[#E8A0B0]/40"
                        style={inter}
                      >
                        + {opt}
                      </button>
                    ))}
                </div>
              </div>

              {/* Cuisine multiselect — powers Plan My Night cuisine filter */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Cuisine
                </label>
                <p className="text-[#6B6B6B] text-xs mb-3" style={inter}>
                  Pick all cuisines this venue serves. Used by the
                  &ldquo;Plan My Night&rdquo; filter to match diners to the
                  right restaurant. Leave empty for venues without food.
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

              {/* Music genre multiselect — powers Plan My Night genre filter */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Music Genre
                </label>
                <p className="text-[#6B6B6B] text-xs mb-3" style={inter}>
                  Pick all genres this venue regularly plays. Used by the
                  &ldquo;Plan My Night&rdquo; filter to match the right vibe.
                  Most relevant for nightclubs and beach clubs.
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
                  rows={3}
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
                  rows={3}
                  className={inputClass + " resize-none"}
                  style={inter}
                />
              </div>

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
                    className={inputClass}
                    style={inter}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Booking
                </label>
                <BookingSection value={booking} onChange={setBooking} />
              </div>

              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Floor Plan Image URL
                </label>
                <input
                  type="url"
                  name="floorPlanUrl"
                  value={form.floorPlanUrl}
                  onChange={handleChange}
                  placeholder="https://cdn.example.com/floor-plans/savaya.jpg"
                  className={inputClass}
                  style={inter}
                />
                <p
                  className="mt-1 text-[11px] text-[#6B6B6B] leading-snug"
                  style={inter}
                >
                  Optional. Shown to users on the &quot;Book VIP Table&quot;
                  flow so they can pick a specific area (e.g.
                  &quot;Daybed D31&quot;). Recommend ~1500px wide JPG.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Opening Hours
                </label>
                <OpeningHoursPicker
                  value={openingHours}
                  onChange={setOpeningHours}
                />
              </div>

              {/* Weekly Schedule Editor */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Weekly Schedule
                </label>
                <p className="text-[#6B6B6B] text-xs mb-3" style={inter}>
                  Per-day curated content. Leave a day blank to skip it. Used by the &quot;This Week&quot; carousel in the app.
                </p>
                <div className="space-y-2">
                  {daysOfWeek.map((day) => {
                    const entry = schedule[day];
                    const hasContent =
                      entry.startTime ||
                      entry.endTime ||
                      entry.genre ||
                      entry.description;
                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-semibold text-[#E8A0B0] uppercase tracking-wider"
                            style={inter}
                          >
                            {dayLabels[day]}
                          </span>
                          {hasContent && (
                            <button
                              type="button"
                              onClick={() => clearScheduleDay(day)}
                              className="text-[10px] text-[#6B6B6B] hover:text-red-400"
                              style={inter}
                            >
                              Clear day
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Start (e.g. 22:00)"
                            value={entry.startTime || ""}
                            onChange={(e) =>
                              updateSchedule(day, "startTime", e.target.value)
                            }
                            className={inputClass + " py-2 text-xs"}
                            style={inter}
                          />
                          <input
                            type="text"
                            placeholder="End (e.g. 03:00)"
                            value={entry.endTime || ""}
                            onChange={(e) =>
                              updateSchedule(day, "endTime", e.target.value)
                            }
                            className={inputClass + " py-2 text-xs"}
                            style={inter}
                          />
                          <input
                            type="text"
                            placeholder="Genre"
                            value={entry.genre || ""}
                            onChange={(e) =>
                              updateSchedule(day, "genre", e.target.value)
                            }
                            className={inputClass + " py-2 text-xs"}
                            style={inter}
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={entry.description || ""}
                            onChange={(e) =>
                              updateSchedule(
                                day,
                                "description",
                                e.target.value
                              )
                            }
                            className={inputClass + " py-2 text-xs"}
                            style={inter}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Price Range
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priceRange: p })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        form.priceRange === p
                          ? "text-[#FFFFFF] border-[#C4707E]"
                          : "text-[#6B6B6B] border-[#2A2A2A] hover:text-[#FFFFFF]"
                      }`}
                      style={
                        form.priceRange === p
                          ? {
                              ...inter,
                              background:
                                "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                            }
                          : inter
                      }
                    >
                      {"$".repeat(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing photos — gallery management */}
              {existingPhotos.length > 0 && (
                <div>
                  <label
                    className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                    style={inter}
                  >
                    Existing Gallery ({existingPhotos.length})
                  </label>
                  <p className="text-[#6B6B6B] text-xs mb-3" style={inter}>
                    Hover a photo to remove it or set it as the hero image. Hero image shows on the venue card.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {existingPhotos.map((url) => {
                      const isHero = url === heroImage;
                      return (
                        <div
                          key={url}
                          className={`relative group rounded-lg overflow-hidden h-24 border ${
                            isHero
                              ? "border-[#C4707E] ring-2 ring-[#C4707E]/30"
                              : "border-[#2A2A2A]"
                          }`}
                        >
                          <Image
                            src={url}
                            alt="venue"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {isHero && (
                            <span
                              className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-[#C4707E] text-white uppercase tracking-wider"
                              style={inter}
                            >
                              Hero
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!isHero && (
                              <button
                                type="button"
                                onClick={() => setHeroImage(url)}
                                title="Set as hero"
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-[#C4707E] text-white"
                                style={inter}
                              >
                                Set Hero
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setExistingPhotos(
                                  existingPhotos.filter((u) => u !== url)
                                );
                                if (heroImage === url) setHeroImage("");
                              }}
                              title="Remove from gallery"
                              className="p-1.5 rounded-full bg-red-500/90 text-white"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Photo upload (add new) */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Add Photos
                </label>
                <p className="text-[#6B6B6B] text-xs mb-2" style={inter}>
                  New photos upload to Cloudinary on Save and append to the existing gallery. Up to 15 per save.
                </p>
                {newPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {newPreviews.map((preview, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg overflow-hidden h-20"
                      >
                        <Image
                          src={preview}
                          alt={`New ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-[#000000]/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#2A2A2A] text-[#B0B0B0] text-sm hover:border-[#C4707E]/40 transition-colors"
                  style={inter}
                >
                  <Upload size={14} />
                  Upload photos
                </button>
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  style={{
                    ...inter,
                    background:
                      "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                  }}
                >
                  <Save size={14} />
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setNewPhotos([]);
                    setNewPreviews([]);
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#B0B0B0] border border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all duration-200"
                  style={inter}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ---- VIEW MODE ---- */
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1
                      className="md:text-3xl text-2xl font-bold italic text-[#FFFFFF]"
                      style={{ ...outfit, letterSpacing: "0.5px" }}
                    >
                      {venueName}
                    </h1>
                    {venue.isActive !== undefined && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          venue.isActive !== false
                            ? "text-emerald-400 bg-emerald-400/10"
                            : "text-red-400 bg-red-400/10"
                        }`}
                        style={inter}
                      >
                        {venue.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {(venue.area || venue.category) && (
                      <span
                        className="text-xs text-[#6B6B6B] uppercase tracking-[0.15em]"
                        style={inter}
                      >
                        {[venue.category, venue.area]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                    {venue.priceRange && (
                      <span className="text-xs text-[#C4707E]" style={inter}>
                        {"$".repeat(venue.priceRange)}
                      </span>
                    )}
                    {Array.isArray(venue.tags) &&
                      venue.tags.length > 0 &&
                      venue.tags.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] text-[#E8A0B0] bg-[#E8A0B0]/10 px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={inter}
                        >
                          {t}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#C4707E] border border-[#C4707E]/40 hover:border-[#C4707E] hover:bg-[#C4707E]/5 transition-all duration-200"
                    style={inter}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-400/40 hover:border-red-400 hover:bg-red-400/5 transition-all duration-200"
                    style={inter}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Read-only stats block */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatTile
                  icon={<span className="text-base">🍍</span>}
                  label="PP rating"
                  primary={
                    stats?.ppRating != null
                      ? Number(stats.ppRating).toFixed(1)
                      : "—"
                  }
                  secondary={`${stats?.ppRatingCount ?? 0} review${stats?.ppRatingCount === 1 ? "" : "s"}`}
                />
                <StatTile
                  icon={<Star size={14} className="text-[#FFB800]" />}
                  label="Google rating"
                  primary={
                    stats?.googleRating != null
                      ? Number(stats.googleRating).toFixed(1)
                      : "—"
                  }
                  secondary={`${stats?.googleRatingCount ?? 0} on Google`}
                />
                <StatTile
                  icon={<Heart size={14} className="text-[#C4707E]" />}
                  label="Favourited by"
                  primary={String(stats?.favoritesCount ?? 0)}
                  secondary="users"
                />
                <StatTile
                  icon={<Activity size={14} className="text-[#E8A0B0]" />}
                  label="Vibe right now"
                  primary={
                    stats?.recentVibe
                      ? `${stats.recentVibe.count} report${stats.recentVibe.count === 1 ? "" : "s"}`
                      : "—"
                  }
                  secondary={
                    stats?.recentVibe
                      ? `${crowdShort[stats.recentVibe.crowd]} · ${musicShort[stats.recentVibe.music]} · ${energyShort[stats.recentVibe.energy]}`
                      : "no recent vibes"
                  }
                />
              </div>

              {/* Lat/lng tile */}
              {(venue.latitude != null || venue.longitude != null) && (
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 mb-6">
                  <div className="flex items-center gap-2 text-xs text-[#B0B0B0]" style={inter}>
                    <MapPin size={12} className="text-[#C4707E]" />
                    Coordinates: {venue.latitude ?? "—"},{" "}
                    {venue.longitude ?? "—"}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {(venue.address || venue.fullAddress) && (
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[#B0B0B0]" style={inter}>
                      {venue.address || venue.fullAddress}
                    </span>
                  </div>
                )}
                {(venue.phone || venue.phoneNumber) && (
                  <div className="flex items-start gap-2">
                    <Phone
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[#B0B0B0]" style={inter}>
                      {venue.phone || venue.phoneNumber}
                    </span>
                  </div>
                )}
                {venue.website && (
                  <div className="flex items-start gap-2">
                    <Globe
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#E8A0B0] hover:underline"
                      style={inter}
                    >
                      {venue.website}
                    </a>
                  </div>
                )}
                {venue.instagram && (
                  <div className="flex items-start gap-2">
                    <Instagram
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[#B0B0B0]" style={inter}>
                      {venue.instagram}
                    </span>
                  </div>
                )}
                {venue.bookingUrl && (
                  <div className="flex items-start gap-2">
                    <Calendar
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <a
                      href={venue.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#E8A0B0] hover:underline"
                      style={inter}
                    >
                      Booking Link
                    </a>
                  </div>
                )}
                {venue.openingHours && (
                  <div className="flex items-start gap-2">
                    <Clock
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[#B0B0B0]" style={inter}>
                      {typeof venue.openingHours === "string"
                        ? venue.openingHours
                        : JSON.stringify(venue.openingHours)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {(venue.description || venue.bio) && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-bold italic text-[#FFFFFF] mb-2"
                    style={outfit}
                  >
                    About
                  </h3>
                  <p
                    className="text-sm text-[#B0B0B0] leading-relaxed"
                    style={inter}
                  >
                    {venue.description || venue.bio}
                  </p>
                </div>
              )}

              {/* Editorial */}
              {venue.editorial && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-bold italic text-[#FFFFFF] mb-2"
                    style={outfit}
                  >
                    Editorial
                  </h3>
                  <p
                    className="text-sm text-[#B0B0B0] leading-relaxed italic"
                    style={inter}
                  >
                    {venue.editorial}
                  </p>
                </div>
              )}

              {/* Weekly schedule preview */}
              {venue.weeklySchedule &&
                typeof venue.weeklySchedule === "object" &&
                Object.keys(venue.weeklySchedule).length > 0 && (
                  <div className="mb-6">
                    <h3
                      className="text-lg font-bold italic text-[#FFFFFF] mb-3"
                      style={outfit}
                    >
                      Weekly Schedule
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {daysOfWeek.map((day) => {
                        const entry = (venue.weeklySchedule as any)?.[day];
                        if (!entry) return null;
                        return (
                          <div
                            key={day}
                            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3"
                          >
                            <p
                              className="text-xs font-semibold text-[#E8A0B0] uppercase tracking-wider mb-1"
                              style={inter}
                            >
                              {dayLabels[day]}
                            </p>
                            {(entry.startTime || entry.endTime) && (
                              <p
                                className="text-xs text-[#B0B0B0]"
                                style={inter}
                              >
                                {entry.startTime || "—"} – {entry.endTime || "—"}
                              </p>
                            )}
                            {entry.genre && (
                              <p
                                className="text-xs text-[#FFFFFF] mt-1"
                                style={inter}
                              >
                                {entry.genre}
                              </p>
                            )}
                            {entry.description && (
                              <p
                                className="text-[11px] text-[#6B6B6B] mt-1"
                                style={inter}
                              >
                                {entry.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Recent ratings + vibes */}
              {stats &&
                ((stats.recentRatings?.length ?? 0) > 0 ||
                  (stats.recentVibes?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    {stats.recentRatings &&
                      stats.recentRatings.length > 0 && (
                        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                          <p
                            className="text-xs font-semibold text-white uppercase tracking-wider mb-3"
                            style={inter}
                          >
                            🍍 Recent PP ratings
                          </p>
                          <ul className="space-y-1.5">
                            {stats.recentRatings.map((r: any) => (
                              <li
                                key={r.id}
                                className="flex items-center justify-between"
                              >
                                <span
                                  className="text-[#E8A0B0] text-sm font-bold"
                                  style={inter}
                                >
                                  {r.score} ★
                                </span>
                                <span
                                  className="text-[#6B6B6B] text-[11px]"
                                  style={inter}
                                >
                                  {formatRelative(r.updatedAt || r.createdAt)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {stats.recentVibes && stats.recentVibes.length > 0 && (
                      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                        <p
                          className="text-xs font-semibold text-white uppercase tracking-wider mb-3"
                          style={inter}
                        >
                          Recent vibe checks
                        </p>
                        <ul className="space-y-1.5">
                          {stats.recentVibes.map((v: any) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between"
                            >
                              <span
                                className="text-[#E8A0B0] text-[11px]"
                                style={inter}
                              >
                                {crowdShort[v.crowd]} · {musicShort[v.music]} ·{" "}
                                {energyShort[v.energy]}
                              </span>
                              <span
                                className="text-[#6B6B6B] text-[11px]"
                                style={inter}
                              >
                                {formatRelative(v.createdAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              {/* Gallery */}
              {gallery.length > 1 && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-bold italic text-[#FFFFFF] mb-3"
                    style={outfit}
                  >
                    Gallery
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {gallery.map((photo: string, i: number) => (
                      <div
                        key={i}
                        className="relative h-24 rounded-lg overflow-hidden border border-[#2A2A2A]"
                      >
                        <Image
                          src={photo}
                          alt={`${venueName} ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Events Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 sm:p-8">
        <h3
          className="text-lg font-bold italic text-[#FFFFFF] mb-5"
          style={outfit}
        >
          Venue Events
        </h3>

        {eventsLoading ? (
          <Spinner />
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event: any) => (
              <Link
                key={event?.id || event?._id}
                href={`/event/${event?.id || event?._id}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#C4707E]/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {event?.eventImages?.[0] ? (
                    <Image
                      src={event.eventImages[0]}
                      alt={event.eventName}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-lg object-cover border border-[#2A2A2A] flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-lg bg-[#000000] border border-[#2A2A2A] flex items-center justify-center text-[#C4707E] text-xs flex-shrink-0"
                      style={outfit}
                    >
                      PP
                    </div>
                  )}
                  <div>
                    <p
                      className="text-sm font-medium text-[#FFFFFF]"
                      style={inter}
                    >
                      {event?.eventName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="flex items-center gap-1 text-[10px] text-[#B0B0B0]"
                        style={inter}
                      >
                        <Calendar size={10} />
                        {new Date(event?.startDate).toLocaleDateString()}
                      </span>
                      {event?.fullAddress && (
                        <span
                          className="flex items-center gap-1 text-[10px] text-[#B0B0B0]"
                          style={inter}
                        >
                          <MapPin size={10} />
                          {event.fullAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    event?.eventStatus === "APPROVED"
                      ? "text-emerald-400 bg-emerald-400/10"
                      : event?.eventStatus === "PENDING"
                        ? "text-yellow-400 bg-yellow-400/10"
                        : event?.eventStatus === "REJECTED"
                          ? "text-red-400 bg-red-400/10"
                          : "text-[#B0B0B0] bg-[#B0B0B0]/10"
                  }`}
                  style={inter}
                >
                  {event?.eventStatus}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <Calendar size={24} className="text-[#6B6B6B]" />
              <p className="text-[#B0B0B0] text-sm" style={inter}>
                No events for this venue yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatTile = ({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) => (
  <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
    <div className="flex items-center justify-between mb-2">
      <p
        className="text-[10px] text-[#B0B0B0] uppercase tracking-wider"
        style={inter}
      >
        {label}
      </p>
      {icon}
    </div>
    <p className="text-xl font-bold text-[#FFFFFF]" style={outfit}>
      {primary}
    </p>
    <p className="text-[11px] text-[#6B6B6B] mt-0.5" style={inter}>
      {secondary}
    </p>
  </div>
);

export default VenueDetailPage;
