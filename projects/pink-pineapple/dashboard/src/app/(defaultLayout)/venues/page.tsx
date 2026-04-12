/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import Spinner from "@/components/common/Spinner";
import Pagination from "@/components/common/Pagination";
import {
  useGetVenuesQuery,
  useDeleteVenueMutation,
} from "@/redux/features/venues/venuesApi";
import { Building, Plus, MapPin, Star, Trash2, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const AREAS = ["All", "Canggu", "Uluwatu", "Seminyak", "Ubud"] as const;
const CATEGORIES = [
  "All",
  "Beach Club",
  "Restaurant",
  "Nightclub",
  "Bar",
  "Lounge",
  "Wellness",
  "Gym",
] as const;

const statusBadge = (isActive: boolean) =>
  isActive
    ? "text-emerald-400 bg-emerald-400/10"
    : "text-red-400 bg-red-400/10";

const VenuesPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("All");
  const [category, setCategory] = useState("All");
  const [deleteVenue] = useDeleteVenueMutation();
  const limit = 15;

  const queryParams = [
    { name: "limit", value: limit },
    { name: "page", value: String(currentPage) },
    ...(area !== "All" ? [{ name: "area", value: area }] : []),
    ...(category !== "All" ? [{ name: "category", value: category }] : []),
    ...(search.trim() ? [{ name: "searchTerm", value: search.trim() }] : []),
  ];

  const { data, isLoading, status: queryState } = useGetVenuesQuery(queryParams);

  const venues = data?.data?.data ?? data?.data ?? [];
  const metaData = data?.data?.meta ?? data?.meta;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const toastId = toast.loading("Deleting venue...");
    try {
      await deleteVenue(id).unwrap();
      toast.success("Venue deleted", { id: toastId });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete venue", {
        id: toastId,
      });
    }
  };

  if (isLoading || queryState === "pending") {
    return <Spinner />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
            style={{ ...playfair, letterSpacing: "0.02em" }}
          >
            Venues
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
            Manage venue listings across Bali
          </p>
        </div>
        <Link
          href="/venues/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{
            ...inter,
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
          }}
        >
          <Plus size={16} />
          Add Venue
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C4707E]/50 transition-colors"
          style={inter}
        >
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a === "All" ? "All Areas" : a}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C4707E]/50 transition-colors"
          style={inter}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>

        <div className="relative sm:ml-auto">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B0B0]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search venues..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E]/50 transition-colors w-full sm:w-64"
            style={inter}
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues?.map((venue: any) => {
          const heroImage =
            venue?.heroImage || venue?.photos?.[0] || venue?.profileImage;
          const isActive = venue?.isActive !== false;
          return (
            <div
              key={venue?.id || venue?._id}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden hover:border-[#C4707E]/30 transition-all duration-200"
              style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
            >
              {/* Hero image */}
              <div className="relative h-36 bg-[#2A2A2A]">
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt={venue.name || "Venue"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Building size={32} className="text-[#6B6B6B]" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${statusBadge(isActive)}`}
                    style={inter}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3
                  className="text-sm font-semibold text-[#FFFFFF] truncate"
                  style={inter}
                >
                  {venue?.name || venue?.fullName || "N/A"}
                </h3>

                <div className="flex items-center gap-2 mt-1.5">
                  {venue?.area && (
                    <span
                      className="flex items-center gap-1 text-xs text-[#B0B0B0]"
                      style={inter}
                    >
                      <MapPin size={10} className="flex-shrink-0" />
                      {venue.area}
                    </span>
                  )}
                  {venue?.category && (
                    <span
                      className="text-xs text-[#6B6B6B] uppercase tracking-wider"
                      style={inter}
                    >
                      {venue.category}
                    </span>
                  )}
                </div>

                {venue?.rating != null && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star
                      size={12}
                      className="text-[#FFB800] fill-[#FFB800]"
                    />
                    <span className="text-xs text-[#FFFFFF]" style={inter}>
                      {Number(venue.rating).toFixed(1)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/venues/${venue?.id || venue?._id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold text-white tracking-wide transition-all duration-200 hover:opacity-90"
                    style={{
                      background:
                        "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                      ...inter,
                    }}
                  >
                    View
                  </Link>
                  <Link
                    href={`/venues/${venue?.id || venue?._id}`}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-[#C4707E] border border-[#C4707E]/40 hover:border-[#C4707E] hover:bg-[#C4707E]/5 tracking-wide transition-all duration-200"
                    style={inter}
                  >
                    <Pencil size={12} />
                  </Link>
                  <button
                    onClick={() =>
                      handleDelete(
                        venue?.id || venue?._id,
                        venue?.name || venue?.fullName || "this venue"
                      )
                    }
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-400/40 hover:border-red-400 hover:bg-red-400/5 tracking-wide transition-all duration-200"
                    style={inter}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {(!venues || venues.length < 1) && (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
              <Building size={28} className="text-[#C4707E]" />
            </div>
            <p className="text-[#FFFFFF] font-medium text-sm" style={inter}>
              {search ? `No venues matching "${search}"` : "No venues found"}
            </p>
            <p className="text-[#B0B0B0] text-xs max-w-xs" style={inter}>
              {search
                ? "Try adjusting your search or filter terms."
                : "Add your first venue to get started."}
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {metaData?.total > limit && (
        <Pagination
          currentPage={metaData?.page ?? currentPage}
          totalItem={metaData?.total}
          limit={limit}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
};

export default VenuesPage;
