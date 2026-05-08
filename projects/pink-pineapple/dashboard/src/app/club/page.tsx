/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMyEventsQuery } from "@/redux/features/events/events.spi";
import { useAllBookingsQuery } from "@/redux/features/events/events.spi";
import { useGetOwnedVenuesQuery } from "@/redux/features/venues/venuesApi";
import ManageEvents from "@/components/modules/ManageEvents/ManageEvents";
import VenueStatsPanel from "@/components/modules/VenueStats/VenueStatsPanel";
import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarPlus,
  CalendarRange,
  CalendarCheck2,
  Clock,
  TrendingUp,
  Users,
  Building,
  ArrowRight,
} from "lucide-react";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Outfit, sans-serif" };

const ClubHomePage = () => {
  // Fetch the partner's venue so we can adapt the dashboard to their state.
  // A freshly-approved partner with isActive=false should see "complete your
  // profile" first; a live venue partner sees event-creation tools first.
  const { data: ownedVenuesData } = useGetOwnedVenuesQuery(undefined);
  const ownedVenue: any = ownedVenuesData?.data?.[0] ?? null;
  const isVenueLive = !!ownedVenue?.isActive;

  // Profile completion checklist mirrors /club/venue's publish gate.
  const profileChecklist = useMemo(() => {
    if (!ownedVenue) {
      return { done: 0, total: 3, items: [] as { ok: boolean; label: string }[] };
    }
    const hasDescription = (ownedVenue.description || "").trim().length >= 20;
    const hasPhotos = Array.isArray(ownedVenue.photos) && ownedVenue.photos.length > 0;
    const hasBooking =
      !!ownedVenue.bookingProvider &&
      (ownedVenue.bookingProvider === "NONE" ||
        !!ownedVenue.bookingUrl ||
        !!ownedVenue.bookingPhone ||
        !!ownedVenue.bookingWhatsapp ||
        !!ownedVenue.bookingInstagram);
    const items = [
      { ok: hasDescription, label: "Add a short description" },
      { ok: hasPhotos, label: "Add at least one photo" },
      { ok: hasBooking, label: "Pick a booking method" },
    ];
    return { done: items.filter((i) => i.ok).length, total: items.length, items };
  }, [ownedVenue]);

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
      {/* Header — primary CTA adapts to venue state. A draft venue's first
          job is to complete the profile (photos, hours, booking) and go live.
          A live venue's first job is to create events on their venue. */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
            style={{ ...garamond, letterSpacing: "0.02em" }}
          >
            {isVenueLive ? "Your Venue Dashboard" : "Welcome to Pink Pineapple"}
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={poppins}>
            {isVenueLive
              ? "Manage your events, track performance, and grow your bookings."
              : "Let's get your venue profile set up so guests can find and book you."}
          </p>
        </div>
        <Link
          href={isVenueLive ? "/club/event" : "/club/venue"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90 self-start sm:self-auto"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            boxShadow: "0 4px 16px rgba(139, 64, 96, 0.25)",
            ...poppins,
          }}
        >
          {isVenueLive ? (
            <>
              <CalendarPlus size={16} />
              Create Event
            </>
          ) : (
            <>
              <Building size={16} />
              Complete Venue Profile
            </>
          )}
        </Link>
      </div>

      {/* Onboarding banner — only shown until the venue is published. Walks
          the partner through the three things they need to do before going
          live. Mirrors the publish gate in /club/venue. */}
      {ownedVenue && !isVenueLive && (
        <Link
          href="/club/venue"
          className="block rounded-xl p-6 sm:p-7 transition-all duration-200 hover:border-[#E8A0B0]/60"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,64,96,0.18), rgba(232,160,176,0.08))",
            border: "1px solid rgba(232,160,176,0.4)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <p
                className="text-xs uppercase tracking-widest text-[#E8A0B0]"
                style={poppins}
              >
                Step {profileChecklist.done + 1} of {profileChecklist.total + 1} — set up your profile
              </p>
              <h2
                className="text-xl sm:text-2xl text-[#FFFFFF] mt-2"
                style={{ ...garamond, fontWeight: 600 }}
              >
                Complete your venue profile to go live
              </h2>
              <p className="text-[#B0B0B0] text-sm mt-2 max-w-xl" style={poppins}>
                Add photos, a short description, and how guests should book.
                This is your venue's identity on Pink Pineapple — events come
                later, after your profile is live.
              </p>
              <ul className="mt-4 space-y-1.5">
                {profileChecklist.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm"
                    style={poppins}
                  >
                    <span
                      className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold ${
                        item.ok
                          ? "bg-emerald-400 text-[#000000]"
                          : "bg-[#2A2A2A] text-[#6B6B6B]"
                      }`}
                    >
                      {item.ok ? "✓" : ""}
                    </span>
                    <span style={{ color: item.ok ? "#FFFFFF" : "#B0B0B0" }}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000000] tracking-wide self-center sm:self-start"
              style={{
                background:
                  "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                ...poppins,
              }}
            >
              Continue setup
              <ArrowRight size={14} />
            </div>
          </div>
        </Link>
      )}

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

      {/* Venue performance — PP ratings, Google ratings, favourites, vibes */}
      <VenueStatsPanel />

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
