/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import Spinner from "@/components/common/Spinner";
import Pagination from "@/components/common/Pagination";
import {
  useAllBookingsQuery,
  useUpdateBookingStatusMutation,
} from "@/redux/features/events/events.spi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarCheck2, Info } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Outfit, sans-serif" };

// Booking status enum from Prisma — only three values exist.
// Confirm action sets ACCEPTED; Cancel sets REJECTED.
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    ACCEPTED: "text-emerald-400 bg-emerald-400/10",
    REJECTED: "text-red-400 bg-red-400/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

const statusLabel = (status: string) => {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "PENDING") return "Pending";
  return status;
};

// Indonesian Rupiah formatter — Bali venues invoice in IDR. Show
// 1500000 → 'Rp 1,500,000'. Backend stores Int so no decimals.
const formatIDR = (amount: number | null | undefined): string => {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rp ${amount.toLocaleString()}`;
  }
};

type TabValue = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

const BookingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [updateBookingStatus] = useUpdateBookingStatusMutation();
  const router = useRouter();

  const queryParams = [
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    ...(activeTab !== "ALL" ? [{ name: "status", value: activeTab }] : []),
  ];

  const {
    data,
    isLoading,
    status: queryState,
  } = useAllBookingsQuery(queryParams);

  const bookings = data?.data?.data;
  const metaData = data?.data?.meta;

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (item: any) =>
        item?.user?.fullName?.toLowerCase().includes(q) ||
        item?.event?.eventName?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const handleStatusUpdate = async (
    bookingId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    const verb = status === "ACCEPTED" ? "Accept" : "Reject";
    const toastId = toast.loading(`${verb}ing booking…`);
    try {
      const res = await updateBookingStatus({
        status,
        bookingId,
      }).unwrap();
      if (res?.data) {
        toast.success(`Booking ${verb.toLowerCase()}ed.`, { id: toastId });
        router.refresh();
      } else {
        toast.error(
          res?.error?.data?.message || `Failed to ${verb.toLowerCase()} booking`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      toast.error(
        err?.data?.message || `Failed to ${verb.toLowerCase()} booking`,
        { id: toastId }
      );
    }
  };

  if (isLoading || queryState === "pending") {
    return <Spinner />;
  }

  const tabs: { label: string; value: TabValue }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-bold text-[#FFFFFF]"
          style={{ ...playfair, letterSpacing: "0.02em" }}
        >
          Bookings
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          In-app reservations and ticket purchases for Pink Pineapple events.
        </p>
      </div>

      {/* Scope banner — explains what this page IS and IS NOT */}
      <div
        className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex gap-3"
      >
        <Info size={16} className="text-[#E8A0B0] flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed" style={inter}>
          <p className="text-[#FFFFFF] font-medium mb-1">
            What this page shows
          </p>
          <p className="text-[#B0B0B0]">
            Reservations and ticket sales made <em>directly through Pink Pineapple</em>{" "}
            for events we list (table reservations + ticket purchases). Approve
            or reject pending bookings here.
          </p>
          <p className="text-[#6B6B6B] mt-2">
            Click-throughs to external booking systems (OpenTable, Booketing,
            WhatsApp, etc.) are tracked separately under attribution analytics.
          </p>
        </div>
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
            placeholder="Search by guest or event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#8B4060]/50 transition-colors w-full sm:w-64"
            style={inter}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#000000]">
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={inter}
              >
                Guest
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden sm:table-cell"
                style={inter}
              >
                Event
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden md:table-cell"
                style={inter}
              >
                Type
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden lg:table-cell"
                style={inter}
              >
                Guests
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden lg:table-cell"
                style={inter}
              >
                Paid
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={inter}
              >
                Status
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden md:table-cell"
                style={inter}
              >
                Created
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={inter}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings?.map((item: any) => {
              const status = item?.status || "PENDING";
              const isPending = status === "PENDING";
              const guestCount = item?.guest ?? 0;
              const female = item?.numberOfFemale ?? 0;
              const male = item?.numberOfMale ?? 0;
              const breakdown =
                female || male ? `${female}F · ${male}M` : null;

              return (
                <TableRow
                  key={item?.id || item?._id}
                  className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
                >
                  <TableCell className="py-4">
                    <div>
                      <p
                        className="text-sm font-medium text-[#FFFFFF]"
                        style={inter}
                      >
                        {item?.user?.fullName || "—"}
                      </p>
                      {item?.user?.email && (
                        <p
                          className="text-[10px] text-[#6B6B6B] mt-0.5"
                          style={inter}
                        >
                          {item.user.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden sm:table-cell"
                    style={inter}
                  >
                    {item?.event?.eventName || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium text-[#C4707E] bg-[#C4707E]/10"
                      style={inter}
                    >
                      {item?.bookingType || "—"}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-sm hidden lg:table-cell"
                    style={inter}
                  >
                    <span className="text-[#FFFFFF]">{guestCount}</span>
                    {breakdown && (
                      <span className="text-[10px] text-[#6B6B6B] ml-2">
                        {breakdown}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-[#FFFFFF] text-sm hidden lg:table-cell"
                    style={inter}
                  >
                    {formatIDR(item?.paidAmount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(status)}`}
                      style={inter}
                    >
                      {statusLabel(status)}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden md:table-cell"
                    style={inter}
                  >
                    {item?.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              item?.id || item?._id,
                              "ACCEPTED"
                            )
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] tracking-wide transition-all duration-200 hover:opacity-90"
                          style={{
                            background:
                              "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                            ...inter,
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              item?.id || item?._id,
                              "REJECTED"
                            )
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-400/40 hover:border-red-400 hover:bg-red-400/5 tracking-wide transition-all duration-200"
                          style={inter}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-xs text-[#6B6B6B]"
                        style={inter}
                      >
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredBookings?.length < 1 && (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
              <CalendarCheck2 size={28} className="text-[#C4707E]" />
            </div>
            <p
              className="text-[#FFFFFF] font-medium text-sm"
              style={inter}
            >
              {search ? `No bookings matching "${search}"` : "No bookings yet"}
            </p>
            <p
              className="text-[#B0B0B0] text-xs max-w-xs"
              style={inter}
            >
              {search
                ? "Try a different search term."
                : "Bookings appear here once guests reserve a table or buy a ticket through Pink Pineapple."}
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

export default BookingsPage;
