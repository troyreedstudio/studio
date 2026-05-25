/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Upload, X } from "lucide-react";
import {
  useSingleEventQuery,
  useUpdateEventMutation,
} from "@/redux/features/events/events.spi";
import { useGetVenuesQuery } from "@/redux/features/venues/venuesApi";
import Spinner from "@/components/common/Spinner";
import ImageCropperModal from "@/components/common/ImageCropperModal";

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

/// Edit Featured Event form — mirrors CreateEvent but prefills from
/// the existing event record via useSingleEventQuery and submits
/// to PUT /events/:id via useUpdateEventMutation. New images are
/// appended to the existing eventImages array (additive, not
/// destructive). Removing an existing image is a separate flow.
const EditEvent = () => {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: eventData, isLoading: isEventLoading } =
    useSingleEventQuery(eventId);
  const [updateEvent, { isLoading: isSaving }] = useUpdateEventMutation();
  const { data: venuesData } = useGetVenuesQuery([
    { name: "limit", value: 200 },
    { name: "page", value: "1" },
  ]);
  const venues = venuesData?.data?.data ?? venuesData?.data ?? [];

  // New image File objects the user has just selected (to be appended).
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  // Existing images (URLs) currently on the event — admin can remove
  // any of these and they'll be omitted from the next save.
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [form, setForm] = useState({
    venueId: "",
    eventName: "",
    descriptions: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    bookingUrl: "",
    bookingProvider: "",
  });

  // Prefill form once event data lands.
  useEffect(() => {
    const ev = eventData?.data;
    if (!ev) return;
    // Backend stores dates as ISO strings; <input type="date"> wants YYYY-MM-DD.
    const toDateInput = (d: any) =>
      d ? new Date(d).toISOString().slice(0, 10) : "";
    setForm({
      venueId: ev.venueId || "",
      eventName: ev.eventName || "",
      descriptions: ev.descriptions || "",
      startDate: toDateInput(ev.startDate),
      endDate: toDateInput(ev.endDate),
      startTime: ev.startTime || "",
      endTime: ev.endTime || "",
      bookingUrl: ev.bookingUrl || "",
      bookingProvider: ev.bookingProvider || "",
    });
    setExistingImages(Array.isArray(ev.eventImages) ? ev.eventImages : []);
  }, [eventData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Crop queue — picked files awaiting their turn in the modal.
  const [pendingCropFiles, setPendingCropFiles] = useState<File[]>([]);

  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";
    setPendingCropFiles([...pendingCropFiles, ...files]);
  };

  const handleCropClose = (cropped: File | null) => {
    if (cropped) {
      setNewImages((prev) => [...prev, cropped]);
      setNewPreviews((prev) => [...prev, URL.createObjectURL(cropped)]);
    }
    setPendingCropFiles((prev) => prev.slice(1));
  };

  const removeNewImage = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewImages(newImages.filter((_, idx) => idx !== i));
    setNewPreviews(newPreviews.filter((_, idx) => idx !== i));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(existingImages.filter((u) => u !== url));
  };

  const onSubmit = async () => {
    if (!form.eventName.trim()) {
      toast.error("Event name is required");
      return;
    }
    const toastId = toast.loading("Saving changes…");
    try {
      const fd = new FormData();
      const eventDataPayload = {
        // Keep existing-images list in sync so backend doesn't drop
        // images the user didn't explicitly remove. New uploads are
        // appended by the backend via files.eventImages.
        eventImages: existingImages,
        eventName: form.eventName,
        descriptions: form.descriptions,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        bookingUrl: form.bookingUrl,
        bookingProvider: form.bookingProvider,
        // Empty string → backend stores null (standalone event).
        venueId: form.venueId || null,
      };
      fd.append("eventData", JSON.stringify(eventDataPayload));
      newImages.forEach((f) => fd.append("eventImages", f));

      await updateEvent({ id: eventId, formData: fd }).unwrap();
      toast.success("Featured event updated", { id: toastId });
      router.push(`/event/${eventId}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update event", {
        id: toastId,
      });
    }
  };

  if (isEventLoading) return <Spinner />;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1
          className="md:text-4xl text-3xl font-bold text-[#FFFFFF]"
          style={{ ...outfit, letterSpacing: "0.02em" }}
        >
          Edit Featured Event
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          Update the event details, swap or add images, or reassign the venue.
        </p>
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
              className={inputClass}
              style={inter}
            />
          </div>

          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Venue
            </label>
            <p className="text-[11px] text-[#6B6B6B] mb-2" style={inter}>
              Optional. Leave blank for standalone events (festivals, touring
              acts, pop-ups).
            </p>
            <select
              name="venueId"
              value={form.venueId}
              onChange={handleChange}
              className={inputClass}
              style={inter}
            >
              <option value="">None — standalone event</option>
              {venues.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.area ? ` · ${v.area}` : ""}
                </option>
              ))}
            </select>
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
              className={inputClass + " resize-none"}
              style={inter}
            />
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Dates / times */}
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            When
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                style={inter}
              >
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
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
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
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
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
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
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Booking */}
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Booking
          </h2>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Booking URL
            </label>
            <p className="text-[11px] text-[#6B6B6B] mb-2" style={inter}>
              Leave blank to inherit the venue&apos;s default booking URL.
            </p>
            <input
              type="url"
              name="bookingUrl"
              value={form.bookingUrl}
              onChange={handleChange}
              placeholder="https://booketing.com/..."
              className={inputClass}
              style={inter}
            />
          </div>
          <div>
            <label
              className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
              style={inter}
            >
              Booking Provider
            </label>
            <select
              name="bookingProvider"
              value={form.bookingProvider}
              onChange={handleChange}
              className={inputClass}
              style={inter}
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Images */}
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Images
          </h2>

          {existingImages.length > 0 && (
            <div>
              <p className="text-[11px] text-[#6B6B6B] mb-2" style={inter}>
                Existing images — tap × to remove on save.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((url) => (
                  <div
                    key={url}
                    className="relative rounded-lg overflow-hidden h-24 group"
                  >
                    <Image
                      src={url}
                      alt="Event image"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-[#000000]/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newPreviews.length > 0 && (
            <div>
              <p className="text-[11px] text-[#6B6B6B] mb-2" style={inter}>
                New images to upload on save.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {newPreviews.map((preview, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg overflow-hidden h-24 group border border-[#E8A0B0]/40"
                  >
                    <Image
                      src={preview}
                      alt={`New image ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-[#000000]/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleNewImageSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-6 text-center hover:border-[#C4707E]/40 transition-colors cursor-pointer"
          >
            <Upload size={20} className="text-[#C4707E] mx-auto mb-2" />
            <p className="text-[#B0B0B0] text-xs" style={inter}>
              Click to add more images
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              ...inter,
              background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          <Link
            href={`/event/${eventId}`}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#B0B0B0] border border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all duration-200"
            style={inter}
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Drag/zoom/crop modal — fires for each newly-picked image in
          sequence so a multi-file pick still gives the admin per-image
          framing control. 16:9 aspect matches the Featured Event card. */}
      {pendingCropFiles.length > 0 && (
        <ImageCropperModal
          key={pendingCropFiles[0].name + pendingCropFiles.length}
          file={pendingCropFiles[0]}
          aspectRatio={16 / 9}
          onClose={handleCropClose}
        />
      )}
    </div>
  );
};

export default EditEvent;
