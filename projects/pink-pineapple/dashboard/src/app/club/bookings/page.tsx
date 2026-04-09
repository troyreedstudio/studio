/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { useAllBookingsQuery } from "@/redux/features/events/events.spi";
import Spinner from "@/components/common/Spinner";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const tabs = ["All", "Confirmed", "Pending", "Cancelled"] as const;

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ClubBookingsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [page, setPage] = useState(1);

  const { data: bookingsData, isLoading } = useAllBookingsQuery([
    { name: "limit", value: "20" },
    { name: "page", value: String(page) },
    ...(activeTab !== "All"
      ? [{ name: "status", value: activeTab.toUpperCase() }]
      : []),
  ]);

  const bookings = bookingsData?.data?.data ?? [];
  const meta = bookingsData?.data?.meta;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...garamond, letterSpacing: "0.02em" }}
        >
          Bookings
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={poppins}>
          Manage guest reservations and bookings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-xl p-1 w-fit border border-[#2A2A2A]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              activeTab === tab
                ? "text-[#000000] font-medium"
                : "text-[#B0B0B0] hover:text-[#FFFFFF]"
            }`}
            style={{
              ...poppins,
              ...(activeTab === tab
                ? { background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)" }
                : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#000000]">
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5" style={poppins}>
                Booking ID
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden sm:table-cell" style={poppins}>
                Guest
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden md:table-cell" style={poppins}>
                Event
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden md:table-cell" style={poppins}>
                Date
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden lg:table-cell" style={poppins}>
                Guests
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden lg:table-cell" style={poppins}>
                Total
              </th>
              <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden sm:table-cell" style={poppins}>
                Status
              </th>
              <th className="text-right text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5" style={poppins}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((booking: any) => (
                <tr
                  key={booking?.id}
                  className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
                >
                  <td className="py-4 px-5 text-sm text-[#FFFFFF] font-mono" style={poppins}>
                    #{booking?.id?.slice(-6)?.toUpperCase()}
                  </td>
                  <td className="py-4 px-5 text-sm text-[#FFFFFF] hidden sm:table-cell" style={poppins}>
                    {booking?.user?.fullName || booking?.guestName || "—"}
                  </td>
                  <td className="py-4 px-5 text-sm text-[#B0B0B0] hidden md:table-cell" style={poppins}>
                    {booking?.event?.eventName || "—"}
                  </td>
                  <td className="py-4 px-5 text-sm text-[#B0B0B0] hidden md:table-cell" style={poppins}>
                    {booking?.createdAt
                      ? new Date(booking.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-4 px-5 text-sm text-[#B0B0B0] hidden lg:table-cell" style={poppins}>
                    {booking?.additionalGuests ?? 0}
                  </td>
                  <td className="py-4 px-5 text-sm text-[#C4707E] hidden lg:table-cell" style={poppins}>
                    {booking?.totalAmount ? `$${booking.totalAmount}` : "—"}
                  </td>
                  <td className="py-4 px-5 hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        statusColors[booking?.status] || statusColors.PENDING
                      }`}
                      style={poppins}
                    >
                      {booking?.status || "PENDING"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      className="text-xs text-[#C4707E] hover:text-[#E8A0B0] transition-colors"
                      style={poppins}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-16 text-center bg-[#000000]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                      <CalendarCheck2 size={28} className="text-[#C4707E]" />
                    </div>
                    <p className="text-[#FFFFFF] font-medium text-sm" style={poppins}>
                      No bookings yet
                    </p>
                    <p className="text-[#B0B0B0] text-xs max-w-xs" style={poppins}>
                      Bookings will appear here once guests start reserving spots at your events.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg text-sm border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={poppins}
          >
            Previous
          </button>
          <span className="text-sm text-[#B0B0B0]" style={poppins}>
            Page {page} of {meta.totalPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPage, p + 1))}
            disabled={page >= meta.totalPage}
            className="px-4 py-2 rounded-lg text-sm border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={poppins}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ClubBookingsPage;
