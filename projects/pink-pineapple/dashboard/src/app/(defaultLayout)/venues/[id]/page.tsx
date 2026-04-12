/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetVenueQuery,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
} from "@/redux/features/venues/venuesApi";
import { useAllEventsQuery } from "@/redux/features/events/events.spi";
import Spinner from "@/components/common/Spinner";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
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
} from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const venueTypes = [
  { value: "Beach Club", label: "Beach Club" },
  { value: "Nightclub", label: "Nightclub" },
  { value: "Bar", label: "Bar" },
  { value: "Lounge", label: "Lounge" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Wellness", label: "Wellness" },
  { value: "Gym", label: "Gym" },
];

const areaOptions = [
  { value: "Canggu", label: "Canggu" },
  { value: "Seminyak", label: "Seminyak" },
  { value: "Uluwatu", label: "Uluwatu" },
  { value: "Ubud", label: "Ubud" },
];

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

const VenueDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetVenueQuery(id);
  const [updateVenue, { isLoading: isUpdating }] = useUpdateVenueMutation();
  const [deleteVenue] = useDeleteVenueMutation();

  const venue = data?.data;

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
    priceRange: 2,
    openingHours: "",
  });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

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
        priceRange: venue.priceRange || 2,
        openingHours: venue.openingHours || "",
      });
    }
  }, [venue]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value != null) {
          formData.append(key, String(value));
        }
      });
      newPhotos.forEach((photo) => {
        formData.append("photos", photo);
      });

      await updateVenue({ id, data: formData }).unwrap();
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

  const heroImage =
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
        {heroImage && !editing && (
          <div className="relative h-56 sm:h-72 bg-[#1A1A1A]">
            <Image
              src={heroImage}
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
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                    style={inter}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
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
                  Opening Hours
                </label>
                <input
                  type="text"
                  name="openingHours"
                  value={form.openingHours}
                  onChange={handleChange}
                  placeholder="e.g. Mon-Sun 10:00-02:00"
                  className={inputClass}
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

              {/* Photo upload */}
              <div>
                <label
                  className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
                  style={inter}
                >
                  Add Photos
                </label>
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
                  <div className="flex items-center gap-3">
                    <h1
                      className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
                      style={{ ...garamond, letterSpacing: "0.02em" }}
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

                  <div className="flex items-center gap-3 mt-2">
                    {(venue.area || venue.category) && (
                      <span
                        className="text-xs text-[#6B6B6B] uppercase tracking-[0.15em]"
                        style={inter}
                      >
                        {[venue.category, venue.area]
                          .filter(Boolean)
                          .join(" \u00B7 ")}
                      </span>
                    )}
                    {venue.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star
                          size={12}
                          className="text-[#FFB800] fill-[#FFB800]"
                        />
                        <span
                          className="text-xs text-[#FFFFFF]"
                          style={inter}
                        >
                          {Number(venue.rating).toFixed(1)}
                        </span>
                      </span>
                    )}
                    {venue.priceRange && (
                      <span
                        className="text-xs text-[#C4707E]"
                        style={inter}
                      >
                        {"$".repeat(venue.priceRange)}
                      </span>
                    )}
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
                {venue.openingHours && (
                  <div className="flex items-start gap-2">
                    <Clock
                      size={14}
                      className="text-[#C4707E] mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[#B0B0B0]" style={inter}>
                      {venue.openingHours}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {(venue.description || venue.bio) && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-semibold text-[#FFFFFF] mb-2"
                    style={garamond}
                  >
                    About
                  </h3>
                  <p className="text-sm text-[#B0B0B0] leading-relaxed" style={inter}>
                    {venue.description || venue.bio}
                  </p>
                </div>
              )}

              {/* Editorial */}
              {venue.editorial && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-semibold text-[#FFFFFF] mb-2"
                    style={garamond}
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

              {/* Gallery */}
              {gallery.length > 1 && (
                <div className="mb-6">
                  <h3
                    className="text-lg font-semibold text-[#FFFFFF] mb-3"
                    style={garamond}
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
          className="text-lg font-semibold text-[#FFFFFF] mb-5"
          style={garamond}
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
                      style={garamond}
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

export default VenueDetailPage;
