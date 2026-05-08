/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Partner-side venue self-edit page. Lives at /club/venue and is the first
// place a venue partner can update their own listing without going through
// admin. Subset of fields vs admin /venues/[id]/page.tsx — partners can
// manage description, photos, hours, contact, and booking, but cannot
// change name, area, category, tags, slug, or active flags (those affect
// listing placement and stay admin-controlled).

import { useState, useEffect, useRef, useMemo } from "react";
import {
  useGetOwnedVenuesQuery,
  useUpdateVenueMutation,
} from "@/redux/features/venues/venuesApi";
import Spinner from "@/components/common/Spinner";
import Image from "next/image";
import { toast } from "sonner";
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
  MapPin,
  Star,
  Save,
  Globe,
  Phone,
  Instagram,
  Upload,
  X,
  Sparkles,
  Image as ImageIcon,
  Eye,
  ChevronDown,
} from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

// ── Weekly Programming types/helpers ────────────────────────────────────
// Distinct from Opening Hours. Hours = when you're open. Programming = what
// you do that night (Hip Hop Wednesday, Open Decks Saturday, etc.). Stored
// on Venue.weeklySchedule as { mon: { startTime, endTime, genre, description }, ... }
// — matches the shape the Flutter app's _applyCuratedSchedule reads.
type ProgrammingDay = {
  active: boolean;
  startTime: string;
  endTime: string;
  genre: string;
  description: string;
};

type ProgrammingValue = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  ProgrammingDay
>;

const PROGRAMMING_DAYS: { key: keyof ProgrammingValue; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

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

const parseProgramming = (raw: any): ProgrammingValue => {
  const result = blankProgramming();
  if (!raw || typeof raw !== "object") return result;
  for (const { key } of PROGRAMMING_DAYS) {
    const v = raw[key];
    if (v && typeof v === "object") {
      result[key] = {
        active: true,
        startTime: typeof v.startTime === "string" ? v.startTime : "",
        endTime: typeof v.endTime === "string" ? v.endTime : "",
        genre: typeof v.genre === "string" ? v.genre : "",
        description: typeof v.description === "string" ? v.description : "",
      };
    }
  }
  return result;
};

const serializeProgramming = (
  v: ProgrammingValue
): Record<string, any> | null => {
  const out: Record<string, any> = {};
  for (const { key } of PROGRAMMING_DAYS) {
    const d = v[key];
    if (!d.active) continue;
    if (!d.genre.trim()) continue; // genre is required; drop empty days
    out[key] = {
      startTime: d.startTime || "",
      endTime: d.endTime || "",
      genre: d.genre.trim(),
      description: d.description.trim(),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
};

const PartnerVenuePage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ownedData, isLoading } = useGetOwnedVenuesQuery(undefined);
  const [updateVenue, { isLoading: isSaving }] = useUpdateVenueMutation();

  const venues: any[] = ownedData?.data ?? [];
  // V1: most partners will own a single venue. If they own multiple, expose
  // a chooser so they can flip between them.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const venue = venues.find((v) => v.id === selectedId) ?? venues[0] ?? null;

  useEffect(() => {
    if (venue && !selectedId) setSelectedId(venue.id);
  }, [venue, selectedId]);

  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("+62 ");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHoursValue>(
    blankOpeningHours()
  );
  const [programming, setProgramming] = useState<ProgrammingValue>(
    blankProgramming()
  );
  const [booking, setBooking] = useState<BookingValue>(blankBooking());
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState<string>("");
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  // Preview modal — partner taps the Preview button in the header to see
  // a phone-frame mock of how their listing renders in the consumer app.
  // Lives in a modal rather than inline so it doesn't dominate the editor.
  const [previewOpen, setPreviewOpen] = useState(false);
  // Collapsible heavy sections. Default state is set in the venue-load
  // effect: open if data exists (returning partner expects to see it),
  // collapsed if empty (clean draft setup).
  const [hoursOpen, setHoursOpen] = useState(false);
  const [programmingOpen, setProgrammingOpen] = useState(false);

  useEffect(() => {
    if (!venue) return;
    setDescription(venue.description || "");
    setPhone(venue.phone || "+62 ");
    setInstagram(venue.instagram || "");
    setWebsite(venue.website || "");
    setOpeningHours(parseOpeningHours(venue.openingHours));
    setProgramming(parseProgramming(venue.weeklySchedule));
    setBooking({
      provider: (venue.bookingProvider || "") as BookingProvider,
      url: venue.bookingUrl || "",
      phone: venue.bookingPhone || "",
      whatsapp: venue.bookingWhatsapp || "",
      instagram: venue.bookingInstagram || "",
      dailyUrls:
        venue.bookingDailyUrls && typeof venue.bookingDailyUrls === "object"
          ? (venue.bookingDailyUrls as Record<string, string>)
          : null,
    });
    setExistingPhotos(Array.isArray(venue.photos) ? venue.photos : []);
    setHeroImage(venue.heroImage || "");
    setNewPhotos([]);
    setNewPreviews([]);
    // Smart-open the heavy collapsible sections when there's already data
    // to show. Empty venue → both collapsed for a clean canvas.
    setHoursOpen(
      !!venue.openingHours &&
        typeof venue.openingHours === "object" &&
        Object.keys(venue.openingHours).length > 0
    );
    setProgrammingOpen(
      !!venue.weeklySchedule &&
        typeof venue.weeklySchedule === "object" &&
        Object.keys(venue.weeklySchedule).length > 0
    );
  }, [venue?.id]);

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

  const removeExistingPhoto = (url: string) => {
    setExistingPhotos(existingPhotos.filter((p) => p !== url));
    if (heroImage === url) {
      setHeroImage(existingPhotos.find((p) => p !== url) || "");
    }
  };

  const setAsHero = (url: string) => setHeroImage(url);

  const handleSave = async () => {
    if (!venue) return;
    const toastId = toast.loading("Saving changes…");
    try {
      const payload: Record<string, unknown> = {
        description,
        phone: phone.trim(),
        instagram,
        website,
        openingHours: serializeOpeningHours(openingHours),
        weeklySchedule: serializeProgramming(programming),
        bookingUrl: booking.url || "",
        bookingProvider: booking.provider || undefined,
        bookingPhone: booking.phone || undefined,
        bookingWhatsapp: booking.whatsapp || undefined,
        bookingInstagram: booking.instagram || undefined,
        bookingDailyUrls:
          booking.dailyUrls && Object.keys(booking.dailyUrls).length > 0
            ? booking.dailyUrls
            : null,
        photos: existingPhotos,
        heroImage,
      };

      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      let body: FormData | typeof payload;
      if (newPhotos.length > 0) {
        const fd = new FormData();
        fd.append("data", JSON.stringify(payload));
        newPhotos.forEach((p) => fd.append("photos", p));
        body = fd;
      } else {
        body = payload;
      }

      const result: any = await updateVenue({ id: venue.id, data: body }).unwrap();
      toast.success("Your venue profile has been updated.", { id: toastId });

      // Sync local state from the server's response. Without this, freshly
      // uploaded photos (which the server appended to the gallery) wouldn't
      // appear in the UI until a hard refresh — they looked "deleted" because
      // the local existingPhotos array was still the pre-save snapshot.
      const updated = result?.data;
      if (updated) {
        setExistingPhotos(Array.isArray(updated.photos) ? updated.photos : []);
        // Auto-promote the first photo to hero if no hero is set yet — gives
        // the partner a sensible default without an extra step.
        const newHero = updated.heroImage || (updated.photos?.[0] ?? "");
        setHeroImage(newHero);
      }

      // Revoke and clear blob preview URLs for the just-uploaded files.
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
      setNewPhotos([]);
      setNewPreviews([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't save changes", { id: toastId });
    }
  };

  if (isLoading) return <Spinner />;

  if (!venue) {
    return (
      <div className="space-y-6">
        <h1
          className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
          style={{ ...outfit, letterSpacing: "0.02em" }}
        >
          My Venue Profile
        </h1>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-10 text-center">
          <Sparkles size={32} className="mx-auto text-[#C4707E] mb-4" />
          <p className="text-[#FFFFFF] font-medium" style={inter}>
            Your venue page is being set up.
          </p>
          <p className="text-[#B0B0B0] text-sm mt-2 max-w-md mx-auto" style={inter}>
            Our team is finalising your listing. You'll receive an email once it's
            live and you can start managing photos, hours, and booking links here.
          </p>
        </div>
      </div>
    );
  }

  // Admin-controlled fields shown read-only so partners understand what's
  // fixed vs editable. If they want to change one of these (e.g. category
  // is wrong), they reply to the welcome email.
  const readOnlyMeta = [
    { label: "Name", value: venue.name },
    { label: "Category", value: venue.category?.replace(/_/g, " ") },
    { label: "Area", value: venue.area },
  ];

  // Publish-readiness gate. We only let a partner flip their listing live
  // once it has the basics — otherwise consumers get half-empty venue cards.
  const hasDescription = (description || "").trim().length >= 20;
  const hasPhotos = existingPhotos.length > 0;
  const hasBooking =
    !!booking.provider &&
    (booking.provider === "NONE" ||
      !!booking.url ||
      !!booking.phone ||
      !!booking.whatsapp ||
      !!booking.instagram);
  const canPublish = hasDescription && hasPhotos && hasBooking;
  const checklistItems = [
    { ok: hasDescription, label: "A short description (at least 20 characters)" },
    { ok: hasPhotos, label: "At least one photo" },
    { ok: hasBooking, label: "A booking method (provider + contact)" },
  ];

  // ── Live preview helpers ──────────────────────────────────────────
  // The preview reads from the editing state (description, openingHours,
  // booking, etc.) so it updates in real time as the partner types or
  // uploads. Hero falls back through saved photos and any pending uploads
  // so a brand-new venue still renders something visual.
  const previewHero = heroImage || existingPhotos[0] || newPreviews[0] || "";

  const formatHourLabel = (t: string): string => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hh = parseInt(h, 10);
    if (isNaN(hh)) return t;
    if (hh === 0 || hh === 24) return m === "00" ? "midnight" : `12:${m}am`;
    if (hh === 12) return m === "00" ? "noon" : `12:${m}pm`;
    const period = hh >= 12 ? "pm" : "am";
    const displayHh = hh > 12 ? hh - 12 : hh;
    return m && m !== "00" ? `${displayHh}:${m}${period}` : `${displayHh}${period}`;
  };

  const todayHoursLabel = useMemo(() => {
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const today = dayKeys[new Date().getDay()];
    const day = openingHours[today];
    if (!day) return "";
    if (day.closed) return "Closed today";
    if (!day.start || !day.end) return "";
    return `Open today · ${formatHourLabel(day.start)} – ${formatHourLabel(day.end)}`;
  }, [openingHours]);

  // Summary chips for collapsed sections — shown in the header so partner
  // can scan state without expanding.
  const hoursSummary = useMemo(() => {
    const labels = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const;
    const allDays = Object.keys(labels) as (keyof typeof labels)[];
    const closedDays = allDays.filter((d) => openingHours[d]?.closed);
    const openCount = 7 - closedDays.length;
    if (openCount === 0) return "Marked closed every day — tap to set";
    if (openCount === 7) return "Open 7 days a week";
    return `Open ${openCount} day${openCount === 1 ? "" : "s"} · Closed ${closedDays
      .map((d) => labels[d])
      .join(", ")}`;
  }, [openingHours]);

  const programmingSummary = useMemo(() => {
    const active = PROGRAMMING_DAYS.filter(
      ({ key }) => programming[key].active && programming[key].genre.trim()
    );
    if (active.length === 0) return "No regular programming yet — tap to add";
    if (active.length === 1) return "1 night programmed";
    return `${active.length} nights programmed`;
  }, [programming]);

  const previewBookingCta = useMemo<string | null>(() => {
    switch (booking.provider) {
      case "BOOKETING":
      case "MTIX":
      case "CROWDSTACK":
      case "OPENTABLE":
      case "RESY":
      case "RESDIARY":
      case "TOAST":
      case "SEVENROOMS":
      case "CUSTOM_WEB":
        return "Book Now";
      case "PHONE":
        return "Call to Book";
      case "WHATSAPP":
        return "Book via WhatsApp";
      case "INSTAGRAM_DM":
        return "DM to Book";
      default:
        return null;
    }
  }, [booking.provider]);

  const togglePublished = async () => {
    if (!venue) return;
    const nextActive = !venue.isActive;
    if (nextActive && !canPublish) {
      toast.error("Finish the basics below before publishing your listing.");
      return;
    }
    const toastId = toast.loading(
      nextActive ? "Publishing your listing…" : "Unpublishing your listing…"
    );
    try {
      await updateVenue({ id: venue.id, data: { isActive: nextActive } }).unwrap();
      toast.success(
        nextActive
          ? "Your listing is now live to guests."
          : "Your listing is back in draft. Guests can no longer see it.",
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't update listing status", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
            style={{ ...outfit, letterSpacing: "0.02em" }}
          >
            My Venue Profile
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-1" style={inter}>
            Update your description, photos, hours, and booking link.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {venues.length > 1 && (
            <select
              value={venue.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className={`${inputClass} w-auto max-w-xs`}
              style={inter}
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          {/* Preview button — opens a modal with the consumer-app phone-frame
              mock. Lives in the header so it's always one tap away while
              editing, without taking up space in the page flow. */}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[#2A2A2A] text-[#FFFFFF] hover:border-[#C4707E]/50 hover:bg-[#1A1A1A] transition-colors"
            style={inter}
          >
            <Eye size={14} className="text-[#E8A0B0]" />
            Preview
          </button>
        </div>
      </div>

      {/* Edit-mode banner — every section below is live editable. Without
          this framing partners weren't sure if they could change things or
          if they were just looking at a profile readout. */}
      <div
        className="rounded-xl border p-4 sm:p-5 flex items-start gap-3"
        style={{
          background: "rgba(196,112,126,0.08)",
          borderColor: "rgba(196,112,126,0.3)",
        }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
          }}
        >
          <span style={{ fontSize: 16 }}>✏️</span>
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-semibold text-[#FFFFFF]"
            style={inter}
          >
            Edit your profile below
          </p>
          <p className="text-xs text-[#B0B0B0] mt-1" style={inter}>
            Every field below — description, photos, hours, contact, booking — is editable any time.
            Make your changes and tap <span className="text-[#E8A0B0] font-semibold">Save changes</span> at the bottom of the page.
          </p>
        </div>
      </div>

      {/* Publish state — visual hero card with toggle */}
      <div
        className="rounded-xl p-6 relative overflow-hidden"
        style={{
          background: venue.isActive
            ? "linear-gradient(135deg, rgba(139,64,96,0.15), rgba(232,160,176,0.10))"
            : "#1A1A1A",
          border: venue.isActive
            ? "1px solid rgba(232,160,176,0.4)"
            : "1px solid #2A2A2A",
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  venue.isActive ? "bg-emerald-400" : "bg-[#6B6B6B]"
                }`}
              />
              <p
                className="text-xs uppercase tracking-widest"
                style={{ ...inter, color: venue.isActive ? "#E8A0B0" : "#6B6B6B" }}
              >
                {venue.isActive ? "Live to guests" : "Draft — not visible"}
              </p>
            </div>
            <h2
              className="text-xl text-[#FFFFFF] mt-2"
              style={{ ...outfit, fontWeight: 600 }}
            >
              {venue.isActive
                ? "Your venue is live on Pink Pineapple."
                : "Ready to go live?"}
            </h2>
            <p className="text-[#B0B0B0] text-sm mt-1 max-w-md" style={inter}>
              {venue.isActive
                ? "Anyone using the app can find, view, and book your venue."
                : "Once you publish, guests using the Pink Pineapple app will be able to discover and book your venue."}
            </p>
          </div>
          <button
            onClick={togglePublished}
            disabled={!venue.isActive && !canPublish}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-[#000000] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: venue.isActive
                ? "#FFFFFF"
                : "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
              color: venue.isActive ? "#000000" : "#000000",
              ...inter,
            }}
          >
            {venue.isActive ? "Unpublish" : canPublish ? "Publish listing" : "Finish setup to publish"}
          </button>
        </div>

        {!venue.isActive && (
          <div className="mt-5 pt-5 border-t border-[#2A2A2A]">
            <p className="text-[11px] uppercase tracking-wider text-[#6B6B6B] mb-3" style={inter}>
              Setup checklist
            </p>
            <ul className="space-y-2">
              {checklistItems.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={inter}>
                  <span
                    className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold ${
                      c.ok ? "bg-emerald-400 text-[#000000]" : "bg-[#2A2A2A] text-[#6B6B6B]"
                    }`}
                  >
                    {c.ok ? "✓" : ""}
                  </span>
                  <span style={{ color: c.ok ? "#FFFFFF" : "#B0B0B0" }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Read-only meta — fields admin controls */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <p className="text-xs uppercase tracking-wider text-[#6B6B6B] mb-3" style={inter}>
          Listing details (managed by Pink Pineapple)
        </p>
        <div className="grid grid-cols-3 gap-4">
          {readOnlyMeta.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] uppercase tracking-wider text-[#6B6B6B]" style={inter}>
                {m.label}
              </p>
              <p className="text-sm text-[#FFFFFF] mt-1" style={inter}>
                {m.value || "—"}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#6B6B6B] mt-4" style={inter}>
          Need to change one of these? Reply to your welcome email and we'll update it.
        </p>
      </div>

      {/* Photos */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#B0B0B0] uppercase tracking-wider" style={inter}>
              Photos
            </p>
            <p className="text-[11px] text-[#6B6B6B] mt-1" style={inter}>
              The first photo (marked Hero) is shown on your venue card. Tap any photo to make it the hero.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#000000]"
            style={{
              background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
              ...inter,
            }}
          >
            <Upload size={14} />
            Add photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {existingPhotos.length === 0 && newPreviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A2A2A] py-12 text-center">
            <ImageIcon size={28} className="mx-auto text-[#6B6B6B] mb-2" />
            <p className="text-[#B0B0B0] text-sm" style={inter}>
              No photos yet. Add 3–6 great shots to bring your venue to life.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingPhotos.map((url) => (
              <div
                key={url}
                className={`relative aspect-square rounded-xl overflow-hidden border ${
                  heroImage === url ? "border-[#C4707E]" : "border-[#2A2A2A]"
                } group cursor-pointer`}
                onClick={() => setAsHero(url)}
              >
                <Image src={url} alt="venue" fill className="object-cover" />
                {heroImage === url && (
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#000000]"
                    style={{
                      background:
                        "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                      ...inter,
                    }}
                  >
                    HERO
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExistingPhoto(url);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#000000]/80 text-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div
                key={src}
                className="relative aspect-square rounded-xl overflow-hidden border border-[#C4707E]/40 group"
              >
                <Image src={src} alt="new" fill className="object-cover" />
                <div
                  className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#FFFFFF] bg-[#000000]/80"
                  style={inter}
                >
                  NEW
                </div>
                <button
                  onClick={() => removeNewPhoto(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#000000]/80 text-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Description */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-3">
        <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider" style={inter}>
          About your venue
        </label>
        <p className="text-[11px] text-[#6B6B6B]" style={inter}>
          A few sentences for guests. What makes you different — the music, the food, the view.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={500}
          placeholder="Tell guests what makes your venue special…"
          className={inputClass}
          style={inter}
        />
        <p className="text-[10px] text-[#6B6B6B] text-right" style={inter}>
          {description.length}/500
        </p>
      </section>

      {/* Opening hours — collapsible. Header always visible with summary
          chip; tap to expand and edit. Default open if hours already set.
          Visually distinct from always-open sections (rose-gold accent) so
          partners notice these are click-to-expand. */}
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
          className="w-full flex items-center justify-between gap-3 p-6 text-left hover:bg-[#0A0A0A] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#E8A0B0] uppercase tracking-wider" style={inter}>
              Opening hours
            </p>
            <p className="text-[11px] text-[#B0B0B0] mt-1 truncate" style={inter}>
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
              style={{ transform: hoursOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </span>
        </button>
        {hoursOpen && (
          <div className="px-6 pb-6 space-y-3 border-t border-[#1A1A1A] pt-4">
            <p className="text-[11px] text-[#6B6B6B]" style={inter}>
              Set hours for each day of the week.
            </p>
            <OpeningHoursPicker value={openingHours} onChange={setOpeningHours} />
          </div>
        )}
      </section>

      {/* Weekly Programming — what kind of night each day of the week is.
          Distinct from Opening Hours: hours = when you're open, programming
          = what theme/genre/format that night. Powers the consumer app's
          "This Week" curated feed. Collapsible — header always visible
          with a summary chip; tap to expand the 7-day editor grid.
          Rose-gold accent matches the Hours card so partners recognise
          these as the click-to-expand pair. */}
      <section
        className="rounded-xl border bg-[#000000] overflow-hidden transition-colors"
        style={{
          borderColor: programmingOpen ? "#2A2A2A" : "rgba(196,112,126,0.4)",
          background: programmingOpen
            ? "#000000"
            : "linear-gradient(135deg, rgba(139,64,96,0.06), rgba(232,160,176,0.03))",
        }}
      >
        <button
          type="button"
          onClick={() => setProgrammingOpen(!programmingOpen)}
          className="w-full flex items-center justify-between gap-3 p-6 text-left hover:bg-[#0A0A0A] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#E8A0B0] uppercase tracking-wider" style={inter}>
              Weekly programming
            </p>
            <p className="text-[11px] text-[#B0B0B0] mt-1 truncate" style={inter}>
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
              style={{ transform: programmingOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </span>
        </button>
        {programmingOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-[#1A1A1A] pt-4">
        <div>
          <p className="text-[11px] text-[#6B6B6B] max-w-xl" style={inter}>
            What kind of night each day is — e.g. <span className="text-[#E8A0B0]">Hip Hop Wednesday</span>,
            <span className="text-[#E8A0B0]"> Open Decks Saturday</span>,
            <span className="text-[#E8A0B0]"> Live Jazz Sunday</span>. Toggle on
            the days you have regular programming. For one-off shows with named
            talent (headline DJs, festivals), use Special Events instead.
          </p>
        </div>

        <div className="space-y-2">
          {PROGRAMMING_DAYS.map(({ key, label }) => {
            const day = programming[key];
            const setDay = (next: Partial<ProgrammingDay>) =>
              setProgramming({ ...programming, [key]: { ...day, ...next } });

            return (
              <div
                key={key}
                className="rounded-xl border bg-[#0A0A0A] overflow-hidden transition-colors"
                style={{
                  borderColor: day.active ? "rgba(196,112,126,0.4)" : "#2A2A2A",
                }}
              >
                <button
                  type="button"
                  onClick={() => setDay({ active: !day.active })}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="text-sm font-medium w-24"
                      style={{
                        ...inter,
                        color: day.active ? "#FFFFFF" : "#B0B0B0",
                      }}
                    >
                      {label}
                    </span>
                    {day.active && day.genre ? (
                      <span className="text-sm text-[#E8A0B0]" style={inter}>
                        {day.genre}
                      </span>
                    ) : !day.active ? (
                      <span className="text-xs text-[#6B6B6B]" style={inter}>
                        No regular programming
                      </span>
                    ) : (
                      <span className="text-xs text-[#6B6B6B] italic" style={inter}>
                        Add details below
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex-shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
                      day.active ? "bg-[#C4707E]" : "bg-[#2A2A2A]"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        day.active ? "translate-x-4" : ""
                      }`}
                    />
                  </span>
                </button>

                {day.active && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#1A1A1A]">
                    <div>
                      <label
                        className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1.5"
                        style={inter}
                      >
                        Night name / genre <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={day.genre}
                        onChange={(e) => setDay({ genre: e.target.value })}
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
                          value={day.startTime}
                          onChange={(e) => setDay({ startTime: e.target.value })}
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
                          value={day.endTime}
                          onChange={(e) => setDay({ endTime: e.target.value })}
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
                        value={day.description}
                        onChange={(e) => setDay({ description: e.target.value })}
                        placeholder="e.g. Resident DJs spinning hip hop, R&B, and trap"
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

      {/* Contact */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-4">
        <p className="text-xs text-[#B0B0B0] uppercase tracking-wider" style={inter}>
          Contact
        </p>

        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mb-2" style={inter}>
              <Phone size={12} /> Phone
            </label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mb-2" style={inter}>
              <Instagram size={12} /> Instagram handle
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourvenue"
              className={inputClass}
              style={inter}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mb-2" style={inter}>
              <Globe size={12} /> Website (optional)
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              className={inputClass}
              style={inter}
            />
          </div>
        </div>
      </section>

      {/* Booking */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-3">
        <p className="text-xs text-[#B0B0B0] uppercase tracking-wider" style={inter}>
          Booking
        </p>
        <p className="text-[11px] text-[#6B6B6B]" style={inter}>
          How should guests book? Pick a provider or contact method.
        </p>
        <BookingSection value={booking} onChange={setBooking} />
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[#000000] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            boxShadow: "0 8px 32px rgba(139, 64, 96, 0.35)",
            ...inter,
          }}
        >
          <Save size={14} />
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Preview modal — full overlay with the consumer-app phone-frame
          mock. Reads from live editing state so mid-edit changes show up
          when partner taps Preview. Click backdrop or X to close. */}
      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-12 right-0 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
              style={inter}
              aria-label="Close preview"
            >
              <X size={16} /> Close
            </button>

            <div
              className="rounded-[28px] border-[6px] border-[#1A1A1A] bg-[#000000] overflow-hidden"
              style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7)" }}
            >
              <div className="relative aspect-[4/5] bg-[#1A1A1A]">
                {previewHero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewHero}
                    alt={venue.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#6B6B6B] text-xs" style={inter}>
                    Hero photo will appear here
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                  <p
                    className="text-[10px] tracking-[0.25em] text-[#E8A0B0] uppercase"
                    style={inter}
                  >
                    {(venue.category || "").replace(/_/g, " ")}
                    {venue.area ? ` · ${venue.area}` : ""}
                  </p>
                  <h3
                    className="text-[26px] leading-tight text-white"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: 700,
                      fontStyle: "italic",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {venue.name}
                  </h3>
                  {description && (
                    <p
                      className="text-[11px] text-white/80"
                      style={{
                        ...inter,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {description}
                    </p>
                  )}
                  {todayHoursLabel && (
                    <p className="text-[10px] text-white/70" style={inter}>
                      {todayHoursLabel}
                    </p>
                  )}
                </div>
              </div>
              {previewBookingCta && (
                <div className="p-3 border-t border-[#1A1A1A]">
                  <div
                    className="w-full py-3 rounded-xl text-sm font-semibold text-[#000000] text-center"
                    style={{
                      background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                      ...inter,
                    }}
                  >
                    {previewBookingCta}
                  </div>
                </div>
              )}
              {!previewBookingCta && booking.provider === "NONE" && (
                <div className="p-3 border-t border-[#1A1A1A]">
                  <p
                    className="text-center text-[11px] text-[#6B6B6B] italic py-2"
                    style={inter}
                  >
                    Walk-in only — no Book button
                  </p>
                </div>
              )}
            </div>

            <p
              className="text-[10px] text-white/50 text-center mt-4"
              style={inter}
            >
              Approximation — the actual app may render some details slightly differently.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerVenuePage;
