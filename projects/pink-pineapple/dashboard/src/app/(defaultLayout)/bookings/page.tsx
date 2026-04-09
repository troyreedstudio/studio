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
import { CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    CONFIRMED: "text-emerald-400 bg-emerald-400/10",
    ACCEPTED: "text-emerald-400 bg-emerald-400/10",
    CANCELLED: "text-red-400 bg-red-400/10",
    REJECTED: "text-red-400 bg-red-400/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

type TabValue = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";

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
    const label = status === "ACCEPTED" ? "Confirm" : "Cancel";
    const toastId = toast.loading(`${label} booking in progress...`);
    try {
      const res = await updateBookingStatus({
        status,
        bookingId,
      }).unwrap();
      if (res?.data) {
        toast.success(`Booking ${label.toLowerCase()}ed successfully!`, {
          id: toastId,
        });
        router.refresh();
      } else {
        toast.error(
          res?.error?.data?.message || `Failed to ${label.toLowerCase()} booking`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      toast.error(
        err?.data?.message || `Failed to ${label.toLowerCase()} booking`,
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
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Cancelled", value: "CANCELLED" },
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
          Manage guest reservations and bookings
        </p>
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
            placeholder="Search by user or event..."
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
                User Name
              </TableHead>
              <TableHead
                className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden sm:table-cell"
                style={inter}
              >
                Event Name
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
              const bookingStatus =
                item?.status || item?.bookingStatus || "PENDING";
              const isPending =
                bookingStatus === "PENDING";
              return (
                <TableRow
                  key={item?.id || item?._id}
                  className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
                >
                  <TableCell className="py-4">
                    <span
                      className="text-sm font-medium text-[#FFFFFF]"
                      style={inter}
                    >
                      {item?.user?.fullName || item?.userName || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden sm:table-cell"
                    style={inter}
                  >
                    {item?.event?.eventName || item?.eventName || "N/A"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium text-[#C4707E] bg-[#C4707E]/10"
                      style={inter}
                    >
                      {item?.bookingType || "TICKET"}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden lg:table-cell"
                    style={inter}
                  >
                    {item?.guestCount || item?.additionalGuests || 0}
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden lg:table-cell"
                    style={inter}
                  >
                    ${item?.paidAmount || item?.totalAmount || "0.00"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(bookingStatus)}`}
                      style={inter}
                    >
                      {bookingStatus}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] text-sm hidden md:table-cell"
                    style={inter}
                  >
                    {item?.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "N/A"}
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
                          Confirm
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
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-xs text-[#6B6B6B]"
                        style={inter}
                      >
                        --
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
              {search ? `No bookings matching "${search}"` : "No bookings found"}
            </p>
            <p
              className="text-[#B0B0B0] text-xs max-w-xs"
              style={inter}
            >
              {search
                ? "Try adjusting your search terms."
                : "Bookings will appear here once guests start reserving spots at your events."}
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
