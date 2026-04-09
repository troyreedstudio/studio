/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import Spinner from "@/components/common/Spinner";
import Pagination from "@/components/common/Pagination";
import {
  useAllUserQuery,
  useUpdateUserStatusMutation,
  useApproveUserMutation,
} from "@/redux/features/user/user.api";
import { Building, Plus, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const venueStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "text-emerald-400 bg-emerald-400/10",
    INACTIVE: "text-red-400 bg-red-400/10",
    SUSPENDED: "text-red-400 bg-red-400/10",
    PENDING: "text-yellow-400 bg-yellow-400/10",
    BLOCKED: "text-red-400 bg-red-400/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

type TabValue = "ALL" | "ACTIVE" | "INACTIVE";

const VenuesPage = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [approveUser] = useApproveUserMutation();
  const router = useRouter();

  const queryParams = [
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    { name: "role", value: "CLUB" },
    ...(activeTab !== "ALL" ? [{ name: "status", value: activeTab }] : []),
  ];

  const {
    data,
    isLoading,
    status: queryState,
  } = useAllUserQuery(queryParams);

  const venues = data?.data?.data;
  const metaData = data?.data?.meta;

  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    if (!search.trim()) return venues;
    const q = search.toLowerCase();
    return venues.filter((item: any) =>
      item?.fullName?.toLowerCase().includes(q)
    );
  }, [venues, search]);

  const handleApprove = async (id: string) => {
    const toastId = toast.loading("Approving venue...");
    try {
      const res = await approveUser({ userId: id }).unwrap();
      if (res?.data) {
        toast.success("Venue approved successfully!", { id: toastId });
        router.refresh();
      } else {
        toast.error(res?.error?.data?.message || "Failed to approve venue", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to approve venue", {
        id: toastId,
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const label = newStatus === "ACTIVE" ? "Activate" : "Suspend";
    const toastId = toast.loading(`${label} venue in progress...`);
    try {
      const res = await updateUserStatus({
        id,
        data: { status: newStatus },
      }).unwrap();
      if (res?.data) {
        toast.success(`Venue ${label.toLowerCase()}d successfully!`, {
          id: toastId,
        });
        router.refresh();
      } else {
        toast.error(
          res?.error?.data?.message || `Failed to ${label.toLowerCase()} venue`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      toast.error(
        err?.data?.message || `Failed to ${label.toLowerCase()} venue`,
        { id: toastId }
      );
    }
  };

  if (isLoading || queryState === "pending") {
    return <Spinner />;
  }

  const tabs: { label: string; value: TabValue }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

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
            Manage venue partners and nightlife locations
          </p>
        </div>
        <Link
          href="/venues/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{ ...inter, background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)" }}
        >
          <Plus size={16} />
          Add Venue
        </Link>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex border-b border-[#2A2A2A]">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setCurrentPage(1);
                setSearch("");
              }}
              className={`px-6 py-3 text-sm font-medium tracking-wide transition-all duration-200 border-b-2 -mb-px
                ${
                  activeTab === tab.value
                    ? "border-[#C4707E] text-[#C4707E]"
                    : "border-transparent text-[#B0B0B0] hover:text-[#FFFFFF]"
                }`}
              style={inter}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
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
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E]/50 transition-colors w-full sm:w-64"
            style={inter}
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVenues?.map((item: any) => {
          const venueStatus = item?.status || "INACTIVE";
          return (
            <div
              key={item?.id || item?._id}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden hover:border-[#C4707E]/30 transition-all duration-200"
              style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
            >
              <div className="h-[3px] w-full bg-gradient-to-r from-[#8B4060] to-[#E8A0B0]" />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  {item?.profileImage ? (
                    <Image
                      src={item.profileImage}
                      alt={item.fullName || "Venue"}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover border border-[#2A2A2A] flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-[#C4707E] text-sm font-bold flex-shrink-0"
                      style={playfair}
                    >
                      {item?.fullName?.charAt(0) || "V"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#FFFFFF] truncate" style={inter}>
                      {item?.fullName || "N/A"}
                    </h3>
                    {item?.fullAddress && (
                      <p className="flex items-center gap-1 text-xs text-[#B0B0B0] mt-0.5 truncate" style={inter}>
                        <MapPin size={10} className="flex-shrink-0" />
                        {item.fullAddress}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${venueStatusBadge(venueStatus)}`}
                    style={inter}
                  >
                    {venueStatus}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item?.isApproved
                        ? "text-emerald-400 bg-emerald-400/10"
                        : "text-yellow-400 bg-yellow-400/10"
                    }`}
                    style={inter}
                  >
                    {item?.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/venues/${item?.id || item?._id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold text-white tracking-wide transition-all duration-200 hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                      ...inter,
                    }}
                  >
                    View
                  </Link>
                  {!item?.isApproved && (
                    <button
                      onClick={() => handleApprove(item?.id || item?._id)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-400/40 hover:border-emerald-400 hover:bg-emerald-400/5 tracking-wide transition-all duration-200"
                      style={inter}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleStatus(item?.id || item?._id, venueStatus)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 border ${
                      venueStatus === "ACTIVE"
                        ? "text-red-400 border-red-400/40 hover:border-red-400 hover:bg-red-400/5"
                        : "text-emerald-400 border-emerald-400/40 hover:border-emerald-400 hover:bg-emerald-400/5"
                    }`}
                    style={inter}
                  >
                    {venueStatus === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVenues?.length < 1 && (
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
                ? "Try adjusting your search terms."
                : "Venues will appear here once partners register on the platform."}
            </p>
          </div>
        </div>
      )}

      {!search && metaData?.total > 15 && (
        <Pagination
          currentPage={metaData?.page}
          totalItem={metaData?.total}
          limit={15}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
};

export default VenuesPage;
