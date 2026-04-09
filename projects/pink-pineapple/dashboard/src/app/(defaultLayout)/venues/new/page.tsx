"use client";
import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const venueTypes = [
  { value: "", label: "Select venue type" },
  { value: "beach_club", label: "Beach Club" },
  { value: "nightclub", label: "Nightclub" },
  { value: "bar", label: "Bar" },
  { value: "lounge", label: "Lounge" },
  { value: "restaurant", label: "Restaurant" },
  { value: "rooftop_bar", label: "Rooftop Bar" },
  { value: "day_club", label: "Day Club" },
  { value: "spa_wellness", label: "Spa & Wellness" },
  { value: "gym", label: "Gym" },
];

const areas = [
  { value: "", label: "Select area" },
  { value: "canggu", label: "Canggu" },
  { value: "seminyak", label: "Seminyak" },
  { value: "uluwatu", label: "Uluwatu" },
  { value: "kuta", label: "Kuta" },
  { value: "ubud", label: "Ubud" },
  { value: "nusa_dua", label: "Nusa Dua" },
];

const inputClass =
  "w-full bg-[#000000] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

const NewVenuePage = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    type: "",
    area: "",
    address: "",
    city: "",
    capacity: "",
    description: "",
    email: "",
    phone: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Venue name is required";
    if (!form.type) newErrors.type = "Venue type is required";
    if (!form.address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // TODO: Wire to backend venue creation endpoint when available
  const handleSubmit = () => {
    if (!validate()) return;
    toast.info("Venue creation coming soon \u2014 backend endpoint in progress");
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
        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>
            Venue Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Pink Pineapple Seminyak"
            className={`${inputClass} ${errors.name ? "border-red-400" : ""}`}
            style={inter}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1" style={inter}>{errors.name}</p>}
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>
            Venue Type <span className="text-red-400">*</span>
          </label>
          <select name="type" value={form.type} onChange={handleChange}
            className={`${inputClass} ${errors.type ? "border-red-400" : ""}`} style={inter}>
            {venueTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.type && <p className="text-red-400 text-xs mt-1" style={inter}>{errors.type}</p>}
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Area</label>
          <select name="area" value={form.area} onChange={handleChange} className={inputClass} style={inter}>
            {areas.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>
            Location / Address <span className="text-red-400">*</span>
          </label>
          <input type="text" name="address" value={form.address} onChange={handleChange}
            placeholder="Street address"
            className={`${inputClass} ${errors.address ? "border-red-400" : ""}`} style={inter} />
          {errors.address && <p className="text-red-400 text-xs mt-1" style={inter}>{errors.address}</p>}
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>City</label>
          <input type="text" name="city" value={form.city} onChange={handleChange}
            placeholder="e.g. Seminyak, Bali" className={inputClass} style={inter} />
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Capacity</label>
          <input type="number" name="capacity" value={form.capacity} onChange={handleChange}
            placeholder="Maximum guest capacity" className={inputClass} style={inter} />
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange}
            placeholder="Describe the venue..." rows={4} className={inputClass + " resize-none"} style={inter} />
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Contact Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="venue@pinkpineapple.com" className={inputClass} style={inter} />
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Contact Phone</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange}
            placeholder="+62 xxx xxxx xxxx" className={inputClass} style={inter} />
        </div>

        <div>
          <label className="block text-xs text-[#B0B0B0] uppercase tracking-wider mb-2" style={inter}>Venue Photos</label>
          <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-8 text-center hover:border-[#C4707E]/40 transition-colors cursor-pointer">
            <Upload size={24} className="text-[#C4707E] mx-auto mb-2" />
            <p className="text-[#B0B0B0] text-sm" style={inter}>Drag & drop images here, or click to browse</p>
            <p className="text-[#6B6B6B] text-xs mt-1" style={inter}>PNG, JPG up to 5MB</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button type="button" onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ ...inter, background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)" }}>
            Create Venue
          </button>
          <Link href="/venues"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#B0B0B0] border border-[#2A2A2A] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all duration-200"
            style={inter}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewVenuePage;
