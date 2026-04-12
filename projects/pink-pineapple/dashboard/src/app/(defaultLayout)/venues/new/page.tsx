/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCreateVenueMutation } from "@/redux/features/venues/venuesApi";
import Image from "next/image";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const venueTypes = [
  { value: "", label: "Select category" },
  { value: "Beach Club", label: "Beach Club" },
  { value: "Nightclub", label: "Nightclub" },
  { value: "Bar", label: "Bar" },
  { value: "Lounge", label: "Lounge" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Wellness", label: "Wellness" },
  { value: "Gym", label: "Gym" },
];

const areas = [
  { value: "", label: "Select area" },
  { value: "Canggu", label: "Canggu" },
  { value: "Seminyak", label: "Seminyak" },
  { value: "Uluwatu", label: "Uluwatu" },
  { value: "Ubud", label: "Ubud" },
];

const priceRanges = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

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
    address: "",
    description: "",
    editorial: "",
    phone: "",
    website: "",
    instagram: "",
    priceRange: 2,
    openingHours: "",
  });

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
    if (!form.address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const toastId = toast.loading("Creating venue...");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("area", form.area);
      formData.append("address", form.address);
      if (form.description) formData.append("description", form.description);
      if (form.editorial) formData.append("editorial", form.editorial);
      if (form.phone) formData.append("phone", form.phone);
      if (form.website) formData.append("website", form.website);
      if (form.instagram) formData.append("instagram", form.instagram);
      formData.append("priceRange", String(form.priceRange));
      if (form.openingHours) formData.append("openingHours", form.openingHours);

      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

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
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...playfair, letterSpacing: "0.02em" }}
        >
          Add New Venue
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          Fill in the details to register a new venue.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-5">
        {/* Name */}
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
            className={`${inputClass} ${errors.name ? "border-red-400" : ""}`}
            style={inter}
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1" style={inter}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Category */}
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
            className={`${inputClass} ${errors.category ? "border-red-400" : ""}`}
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

        {/* Area */}
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
            className={`${inputClass} ${errors.area ? "border-red-400" : ""}`}
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

        {/* Address */}
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Street address"
            className={`${inputClass} ${errors.address ? "border-red-400" : ""}`}
            style={inter}
          />
          {errors.address && (
            <p className="text-red-400 text-xs mt-1" style={inter}>
              {errors.address}
            </p>
          )}
        </div>

        {/* Description */}
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
            placeholder="Describe the venue..."
            rows={3}
            className={inputClass + " resize-none"}
            style={inter}
          />
        </div>

        {/* Editorial */}
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
            placeholder="Insider editorial write-up..."
            rows={3}
            className={inputClass + " resize-none"}
            style={inter}
          />
        </div>

        {/* Phone */}
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
            placeholder="+62 xxx xxxx xxxx"
            className={inputClass}
            style={inter}
          />
        </div>

        {/* Website */}
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
            placeholder="https://..."
            className={inputClass}
            style={inter}
          />
        </div>

        {/* Instagram */}
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

        {/* Price Range */}
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

        {/* Opening Hours */}
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

        {/* Photos */}
        <div>
          <label
            className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2"
            style={inter}
          >
            Venue Photos
          </label>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden h-24">
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
              PNG, JPG up to 5MB. First image is used as the hero.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              ...inter,
              background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
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
