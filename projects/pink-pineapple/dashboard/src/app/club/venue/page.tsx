/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Partner-side venue self-edit page. Lives at /club/venue and is the first
// place a venue partner can update their own listing without going through
// admin. Subset of fields vs admin /venues/[id]/page.tsx — partners can
// manage description, photos, hours, contact, and booking, but cannot
// change name, area, category, tags, slug, or active flags (those affect
// listing placement and stay admin-controlled).

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

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
  const [booking, setBooking] = useState<BookingValue>(blankBooking());
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState<string>("");
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!venue) return;
    setDescription(venue.description || "");
    setPhone(venue.phone || "+62 ");
    setInstagram(venue.instagram || "");
    setWebsite(venue.website || "");
    setOpeningHours(parseOpeningHours(venue.openingHours));
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

      await updateVenue({ id: venue.id, data: body }).unwrap();
      toast.success("Your venue page has been updated.", { id: toastId });
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

      {/* Opening hours */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 space-y-3">
        <p className="text-xs text-[#B0B0B0] uppercase tracking-wider" style={inter}>
          Opening hours
        </p>
        <p className="text-[11px] text-[#6B6B6B]" style={inter}>
          Set hours for each day of the week.
        </p>
        <OpeningHoursPicker value={openingHours} onChange={setOpeningHours} />
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
    </div>
  );
};

export default PartnerVenuePage;
