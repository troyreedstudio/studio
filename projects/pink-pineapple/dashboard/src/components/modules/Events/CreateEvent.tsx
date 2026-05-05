/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Upload, X, Info, ExternalLink } from "lucide-react";
import { useCreateEventMutation } from "@/redux/features/events/events.spi";
import { useGetVenuesQuery } from "@/redux/features/venues/venuesApi";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

const PROVIDER_OPTIONS = [
  { value: "", label: "Inherit from venue (recommended)" },
  { value: "BOOKETING", label: "Booketing" },
  { value: "MTIX", label: "Mtix" },
  { value: "CROWDSTACK", label: "Crowdstack" },
  { value: "OPENTABLE", label: "OpenTable" },
  { value: "RESY", label: "Resy" },
  { value: "RESDIARY", label: "Resdiary" },
  { value: "TOAST", label: "Toast" },
  { value: "SEVENROOMS", label: "SevenRooms" },
  { value: "CUSTOM_WEB", label: "Custom website" },
  { value: "PHONE", label: "Phone only" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM_DM", label: "Instagram DM" },
  { value: "NONE", label: "Walk-in only" },
];

/// The simple "link out for tickets" event form. Most events use this —
/// it announces what's on at a venue and routes users to the venue's
/// existing booking system (or an event-specific override URL).
///
/// For the rare PP-direct ticketed/table flow, see the heavier
/// CreateTicketedEvent at /event/create-ticketed.
const CreateEvent = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createEvent, { isLoading }] = useCreateEventMutation();

  const { data: venuesData } = useGetVenuesQuery([
    { name: "limit", value: 200 },
    { name: "page", value: "1" },
  ]);
  const venues = venuesData?.data?.data ?? venuesData?.data ?? [];

  const [eventImages, setEventImages] = useState<File[]>([]);
  const [eventPreviews, setEventPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    venueId: "",
    eventName: "",
    descriptions: "",
    startDate: "",
    startTime: "",
    endTime: "",
    endDate: "", // optional — defaults to startDate
    bookingUrl: "",
    bookingProvider: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEventImages([...eventImages, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setEventPreviews([...eventPreviews, ...previews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(eventPreviews[index]);
    setEventImages(eventImages.filter((_, i) => i !== index));
    setEventPreviews(eventPreviews.filter((_, i) => i !== index));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.eventName.trim()) next.eventName = "Event name is required";
    if (!form.venueId) next.venueId = "Pick the venue this event is at";
    if (!form.startDate) next.startDate = "Start date required";
    if (!form.startTime) next.startTime = "Start time required";
    if (eventImages.length === 0) next.eventImages = "At least one image";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    const toastId = toast.loading("Creating event…");
    try {
      const fd = new FormData();
      const eventData = {
        venueId: form.venueId,
        eventName: form.eventName,
        descriptions: form.descriptions,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        bookingUrl: form.bookingUrl,
        bookingProvider: form.bookingProvider || undefined,
      };
      fd.append("eventData", JSON.stringify(eventData));
      eventImages.forEach((f) => fd.append("eventImages", f));

      await createEvent(fd).unwrap();
      toast.success("Event created!", { id: toastId });
      router.push("/event");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create event", {
        id: toastId,
      });
    }
  };

  // Derive the selected venue's bookingProvider so we can hint the user
  // about what will happen when bookingUrl/provider are left blank.
  const selectedVenue = venues.find((v: any) => v.id === form.venueId);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1
            className="md:text-4xl text-3xl font-bold text-[#FFFFFF]"
            style={{ ...outfit, letterSpacing: "0.02em" }}
          >
            Create Event
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
            Add a new event tile. Tickets link out to the venue&apos;s booking
            system — Pink Pineapple tracks every Buy click for attribution.
          </p>
        </div>
        <Link
          href="/event/create-ticketed"
          className="text-[11px] text-[#6B6B6B] hover:text-[#E8A0B0] transition-colors"
          style={inter}
        >
          Selling tickets directly? Use the ticketed flow →
        </Link>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex gap-3">
        <Info size={16} className="text-[#E8A0B0] flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed" style={inter}>
          <p className="text-[#FFFFFF] font-medium mb-1">
            Most events should use this form
          </p>
          <p className="text-[#B0B0B0]">
            For events where the venue handles bookings on their own system
            (Booketing, Mtix, OpenTable, WhatsApp, Instagram, phone, etc.).
            Pink Pineapple shows the event tile and routes the user to the
            booking page with attribution tracking.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-6">
        {/* Basics */}
        <div className="space-y-4">
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
              Event Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="eventName"
              value={form.eventName}
              onChange={handleChange}
              placeholder="e.g. Bali Day Zero · French Montana Live"
              className={`${inputClass} ${errors.eventName ? "border-red-400" : ""}`}
              style={inter}
            />
            {errors.eventName && (
              <p className="text-red-400 text-xs mt-1" style={inter}>
                {errors.eventName}
              </p>
            )}
          </div>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Venue <span className="text-red-400">*</span>
            </label>
            <select
              name="venueId"
              value={form.venueId}
              onChange={handleChange}
              className={`${inputClass} ${errors.venueId ? "border-red-400" : ""}`}
              style={inter}
            >
              <option value="">Select a venue…</option>
              {venues.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.area ? ` · ${v.area}` : ""}
                </option>
              ))}
            </select>
            {errors.venueId && (
              <p className="text-red-400 text-xs mt-1" style={inter}>
                {errors.venueId}
              </p>
            )}
          </div>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Description
            </label>
            <textarea
              name="descriptions"
              value={form.descriptions}
              onChange={handleChange}
              rows={4}
              placeholder="The pitch — what makes this night worth showing up for. Lineup, vibe, dress code, anything special."
              className={inputClass + " resize-none"}
              style={inter}
            />
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* When */}
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            When
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className={`${inputClass} ${errors.startDate ? "border-red-400" : ""}`}
                style={inter}
              />
              {errors.startDate && (
                <p className="text-red-400 text-xs mt-1" style={inter}>
                  {errors.startDate}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Start Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className={`${inputClass} ${errors.startTime ? "border-red-400" : ""}`}
                style={inter}
              />
              {errors.startTime && (
                <p className="text-red-400 text-xs mt-1" style={inter}>
                  {errors.startTime}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className={inputClass}
                style={inter}
              />
            </div>
          </div>
          <div>
            <label
              className="block text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1.5"
              style={inter}
            >
              Multi-day event? End date (optional)
            </label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className={inputClass + " py-2"}
              style={inter}
            />
            <p className="text-[10px] text-[#6B6B6B] mt-1.5" style={inter}>
              Defaults to the start date for single-night events.
            </p>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Tickets / Booking */}
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Tickets / Booking
          </h2>
          <p className="text-[11px] text-[#6B6B6B] -mt-1" style={inter}>
            Where guests buy tickets or reserve. Leave both blank to use the
            venue&apos;s default booking flow.
          </p>

          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Event-specific booking URL
            </label>
            <input
              type="url"
              name="bookingUrl"
              value={form.bookingUrl}
              onChange={handleChange}
              placeholder="https://booketing.com/savaya/bali-day-zero"
              className={inputClass}
              style={inter}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#6B6B6B]" style={inter}>
                {selectedVenue?.bookingUrl
                  ? `Will inherit ${selectedVenue.bookingUrl} if left blank.`
                  : "If blank, Pink Pineapple uses the venue's default booking URL."}
              </p>
              {form.bookingUrl && (
                <a
                  href={form.bookingUrl}
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

          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Booking Provider Override
            </label>
            <select
              name="bookingProvider"
              value={form.bookingProvider}
              onChange={handleChange}
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
              Only set this if the event uses a different booking system than
              the venue&apos;s default
              {selectedVenue?.bookingProvider
                ? ` (${selectedVenue.bookingProvider})`
                : ""}
              .
            </p>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Photos */}
        <div className="space-y-3">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Photos <span className="text-red-400">*</span>
          </h2>
          <p className="text-[11px] text-[#6B6B6B]" style={inter}>
            First image becomes the event tile&apos;s hero on the home screen.
            Recommended size 1080×1080.
          </p>

          {eventPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {eventPreviews.map((preview, i) => (
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
                    onClick={() => removeImage(i)}
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
            onChange={handleImageSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center hover:border-[#C4707E]/40 transition-colors cursor-pointer ${
              errors.eventImages ? "border-red-400" : "border-[#2A2A2A]"
            }`}
          >
            <Upload size={24} className="text-[#C4707E] mx-auto mb-2" />
            <p className="text-[#B0B0B0] text-sm" style={inter}>
              Drag & drop, or click to upload
            </p>
            <p className="text-[#6B6B6B] text-xs mt-1" style={inter}>
              PNG / JPG up to 5MB.
            </p>
          </div>
          {errors.eventImages && (
            <p className="text-red-400 text-xs" style={inter}>
              {errors.eventImages}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              ...inter,
              background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            {isLoading ? "Creating…" : "Create Event"}
          </button>
          <Link
            href="/event"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#B0B0B0] border border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all"
            style={inter}
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
