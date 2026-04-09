/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMyEventsQuery } from "@/redux/features/events/events.spi";
import { useAllBookingsQuery } from "@/redux/features/events/events.spi";
import ManageEvents from "@/components/modules/ManageEvents/ManageEvents";
import Link from "next/link";
import { useMemo } from "react";
import { CalendarPlus, CalendarRange, CalendarCheck2, Clock, TrendingUp, Users } from "lucide-react";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const ClubHomePage = () => {
  const { data: allEventsData } = useMyEventsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
  ]);

  const { data: pendingData } = useMyEventsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
    { name: "eventStatus", value: "PENDING" },
  ]);

  const { data: approvedData } = useMyEventsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
    { name: "eventStatus", value: "APPROVED" },
  ]);

  const { data: bookingsData } = useAllBookingsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
  ]);

  const totalEvents = allEventsData?.data?.meta?.total ?? 0;
  const pendingCount = pendingData?.data?.meta?.total ?? 0;
  const approvedCount = approvedData?.data?.meta?.total ?? 0;
  const totalBookings = bookingsData?.data?.meta?.total ?? 0;
  const allBookings = bookingsData?.data?.data ?? [];

  const bookingsThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return allBookings.filter((b: any) => new Date(b?.createdAt) >= weekAgo).length;
  }, [allBookings]);

  const totalGuests = useMemo(() => {
    const events = allEventsData?.data?.data ?? [];
    return events.reduce((sum: number, e: any) => sum + (e?.additionalGuests || 0), 0);
  }, [allEventsData]);

  const stats = [
    { label: "Total Events", value: totalEvents, icon: CalendarRange },
    { label: "Approved", value: approvedCount, icon: CalendarCheck2 },
    { label: "Pending Review", value: pendingCount, icon: Clock },
    { label: "Total Bookings", value: totalBookings, icon: Users },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
            style={{ ...garamond, letterSpacing: "0.02em" }}
          >
            Your Venue Dashboard
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={poppins}>
            Manage your events, track performance, and grow your bookings.
          </p>
        </div>
        <Link
          href="/club/event"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90 self-start sm:self-auto"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            boxShadow: "0 4px 16px rgba(139, 64, 96, 0.25)",
            ...poppins,
          }}
        >
          <CalendarPlus size={16} />
          Create Event
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden hover:border-[#C4707E]/30 transition-colors"
            style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
          >
            <div className="h-[3px] w-full bg-gradient-to-r from-[#8B4060] to-[#E8A0B0]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={poppins}>
                  {stat.label}
                </p>
                <stat.icon size={16} className="text-[#C4707E]" />
              </div>
              <p className="text-3xl font-bold text-[#C4707E]" style={garamond}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Insights */}
      <div>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4" style={garamond}>
          Performance Snapshot
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-[#E8A0B0]" />
            </div>
            <div>
              <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={poppins}>
                Bookings This Week
              </p>
              <p className="text-2xl font-bold text-[#E8A0B0]" style={garamond}>
                {bookingsThisWeek}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
              <Users size={18} className="text-[#E8A0B0]" />
            </div>
            <div>
              <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={poppins}>
                Total Guests
              </p>
              <p className="text-2xl font-bold text-[#E8A0B0]" style={garamond}>
                {totalGuests}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
              <CalendarCheck2 size={18} className="text-[#E8A0B0]" />
            </div>
            <div>
              <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={poppins}>
                Approval Rate
              </p>
              <p className="text-2xl font-bold text-[#E8A0B0]" style={garamond}>
                {totalEvents > 0
                  ? `${Math.round((approvedCount / totalEvents) * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Events Management */}
      <div>
        <h2 className="text-xl font-semibold text-[#FFFFFF] mb-4" style={garamond}>
          Your Events
        </h2>
        <ManageEvents />
      </div>
    </div>
  );
};

export default ClubHomePage;
