/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { CalendarPlus, CalendarRange, MapPin, CalendarCheck2, Shield, TrendingUp, Sparkles } from "lucide-react";
import Events from "@/components/modules/Events/Events";
import { useAllEventsQuery, useAllBookingsQuery } from "@/redux/features/events/events.spi";
import { useAllUserQuery } from "@/redux/features/user/user.api";
import DeleteModal from "@/components/common/DeleteModal";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Playfair Display, serif" };

const CommonLayoutHomePage = () => {
  const { data: eventsData } = useAllEventsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
  ]);

  const { data: pendingEventsData } = useAllEventsQuery([
    { name: "limit", value: 5 },
    { name: "page", value: "1" },
    { name: "eventStatus", value: "PENDING" },
  ]);

  const { data: usersData } = useAllUserQuery([
    { name: "limit", value: 5 },
    { name: "page", value: "1" },
    { name: "role", value: "USER" },
  ]);

  const { data: bookingsData } = useAllBookingsQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
  ]);

  const { data: clubsData } = useAllUserQuery([
    { name: "limit", value: 100 },
    { name: "page", value: "1" },
    { name: "role", value: "CLUB" },
  ]);

  const totalEvents = eventsData?.data?.meta?.total ?? 0;
  const pendingCount = pendingEventsData?.data?.meta?.total ?? 0;
  const totalBookings = bookingsData?.data?.meta?.total ?? 0;
  const pendingEvents = pendingEventsData?.data?.data ?? [];
  const recentUsers = usersData?.data?.data ?? [];
  const allBookings = bookingsData?.data?.data ?? [];
  const activeClubs = clubsData?.data?.data?.filter((c: any) => c?.status === "ACTIVE")?.length ?? 0;

  const bookingsThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return allBookings.filter((b: any) => new Date(b?.createdAt) >= weekAgo).length;
  }, [allBookings]);

  const stats = [
    { label: "Total Venues", value: activeClubs, icon: MapPin },
    { label: "Active Events", value: totalEvents, icon: CalendarRange },
    { label: "Total Bookings", value: totalBookings, icon: CalendarCheck2 },
    { label: "Pending Approvals", value: pendingCount, icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-bold text-[#FFFFFF]"
          style={{ ...playfair, letterSpacing: "0.02em" }}
        >
          Pink Pineapple
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          Venue Management Dashboard
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden hover:border-[#8B4060]/30 transition-colors"
            style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
          >
            <div className="h-[3px] w-full bg-gradient-to-r from-[#8B4060] via-[#C4707E] to-[#E8A0B0]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[#B0B0B0] text-xs uppercase tracking-wider"
                  style={inter}
                >
                  {stat.label}
                </p>
                <stat.icon size={16} className="text-[#C4707E]" />
              </div>
              <p
                className="text-3xl font-bold pp-gradient-text"
                style={playfair}
              >
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#E8A0B0]" />
          </div>
          <div>
            <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={inter}>
              Bookings This Week
            </p>
            <p className="text-2xl font-bold pp-gradient-text" style={playfair}>
              {bookingsThisWeek}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
            <MapPin size={18} className="text-[#E8A0B0]" />
          </div>
          <div>
            <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={inter}>
              Active Venues
            </p>
            <p className="text-2xl font-bold pp-gradient-text" style={playfair}>
              {activeClubs}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E8A0B0]/10 flex items-center justify-center">
            <Sparkles size={18} className="text-[#E8A0B0]" />
          </div>
          <div>
            <p className="text-[#B0B0B0] text-xs uppercase tracking-wider" style={inter}>
              Approval Rate
            </p>
            <p className="text-2xl font-bold pp-gradient-text" style={playfair}>
              {totalEvents > 0
                ? `${Math.round(((totalEvents - pendingCount) / totalEvents) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-[#FFFFFF] mb-4" style={playfair}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/event/create"
            className="rounded-xl border border-[#8B4060]/40 bg-[#1A1A1A] p-6 hover:border-[#8B4060] transition-all duration-200 group flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B4060]/20 to-[#E8A0B0]/10 flex items-center justify-center group-hover:from-[#8B4060]/30 group-hover:to-[#E8A0B0]/20 transition-all">
              <CalendarPlus size={22} className="text-[#C4707E]" />
            </div>
            <div>
              <p className="text-[#FFFFFF] font-medium text-sm" style={inter}>
                Create New Event
              </p>
              <p className="text-[#B0B0B0] text-xs mt-0.5" style={inter}>
                Set up a new event for your venues
              </p>
            </div>
          </Link>
          <Link
            href="/venues"
            className="rounded-xl border border-[#8B4060]/40 bg-[#1A1A1A] p-6 hover:border-[#8B4060] transition-all duration-200 group flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B4060]/20 to-[#E8A0B0]/10 flex items-center justify-center group-hover:from-[#8B4060]/30 group-hover:to-[#E8A0B0]/20 transition-all">
              <MapPin size={22} className="text-[#C4707E]" />
            </div>
            <div>
              <p className="text-[#FFFFFF] font-medium text-sm" style={inter}>
                Manage Venues
              </p>
              <p className="text-[#B0B0B0] text-xs mt-0.5" style={inter}>
                View and manage venue partners
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Pending Events - Quick Review */}
      {pendingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#FFFFFF]" style={playfair}>
              Pending Events
            </h2>
            <Link
              href="/event"
              className="text-xs text-[#C4707E] hover:text-[#E8A0B0] transition-colors"
              style={inter}
            >
              View All →
            </Link>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#000000]">
                  <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5" style={inter}>
                    Event
                  </th>
                  <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden sm:table-cell" style={inter}>
                    Date
                  </th>
                  <th className="text-left text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5 hidden md:table-cell" style={inter}>
                    Guests
                  </th>
                  <th className="text-right text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 px-5" style={inter}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingEvents.map((item: any) => (
                  <tr
                    key={item?.id}
                    className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {item?.eventImages?.[0] ? (
                          <Image
                            src={item.eventImages[0]}
                            alt={item.eventName}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover border border-[#2A2A2A]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#C4707E] text-xs" style={playfair}>
                            PP
                          </div>
                        )}
                        <span className="text-sm font-medium text-[#FFFFFF]" style={inter}>
                          {item?.eventName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-[#B0B0B0] text-sm hidden sm:table-cell" style={inter}>
                      {new Date(item?.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 text-[#B0B0B0] text-sm hidden md:table-cell" style={inter}>
                      {item?.additionalGuests || 0}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <DeleteModal
                          btn="approve"
                          id={item?.id}
                          type="event"
                          message="Approve"
                          action="APPROVED"
                        />
                        <DeleteModal
                          btn="btn"
                          id={item?.id}
                          type="event"
                          message="Reject"
                          action="REJECTED"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#FFFFFF]" style={playfair}>
            Recent Users
          </h2>
          <Link
            href="/user"
            className="text-xs text-[#C4707E] hover:text-[#E8A0B0] transition-colors"
            style={inter}
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {recentUsers.length > 0 ? (
            recentUsers.map((user: any) => (
              <div
                key={user?.id}
                className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 hover:border-[#8B4060]/30 transition-colors flex flex-col items-center text-center gap-3"
              >
                <Image
                  src={user?.profileImage || "/placeholders/image_placeholder.png"}
                  alt={user?.fullName || "User"}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border border-[#2A2A2A]"
                />
                <div>
                  <p className="text-sm font-medium text-[#FFFFFF] truncate max-w-[140px]" style={inter}>
                    {user?.fullName || "Unknown"}
                  </p>
                  <p className="text-xs text-[#B0B0B0] mt-0.5 truncate max-w-[140px]" style={inter}>
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-[#6B6B6B] mt-1" style={inter}>
                    Joined {new Date(user?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-[#B0B0B0] text-sm" style={inter}>
                No users yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div>
        <h2 className="text-xl font-bold text-[#FFFFFF] mb-4" style={playfair}>
          All Events
        </h2>
        <Events />
      </div>
    </div>
  );
};

export default CommonLayoutHomePage;
