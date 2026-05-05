/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useGetBookingClicksOverviewQuery } from "@/redux/features/venues/venuesApi";
import Spinner from "@/components/common/Spinner";
import {
  TrendingUp,
  Building,
  ExternalLink,
  Info,
  Activity,
} from "lucide-react";
import Link from "next/link";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

const PROVIDER_LABEL: Record<string, string> = {
  BOOKETING: "Booketing",
  MTIX: "Mtix",
  CROWDSTACK: "Crowdstack",
  OPENTABLE: "OpenTable",
  RESY: "Resy",
  RESDIARY: "Resdiary",
  TOAST: "Toast",
  SEVENROOMS: "SevenRooms",
  CUSTOM_WEB: "Custom Website",
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  INSTAGRAM_DM: "Instagram DM",
  NONE: "Walk-in only",
  UNKNOWN: "Unknown",
};

const WINDOW_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
];

/// Build a sequential array of date keys from cutoff to today so the
/// sparkline renders evenly even on days with zero clicks.
const buildDayWindow = (windowDays: number): string[] => {
  const out: string[] = [];
  const today = new Date();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

const AnalyticsPage = () => {
  const [windowDays, setWindowDays] = useState<number>(30);
  const { data, isLoading, error } = useGetBookingClicksOverviewQuery(windowDays);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="py-16 text-center text-[#B0B0B0]" style={inter}>
        Failed to load analytics. Make sure you&apos;re signed in as ADMIN or CLUB.
      </div>
    );
  }

  const overview = data?.data;
  const totals = overview?.totals || { allTime: 0, recent: 0, withinWindow: windowDays };
  const byDay: Record<string, number> = overview?.byDay || {};
  const byProvider: Record<string, number> = overview?.byProvider || {};
  const topVenues: any[] = overview?.topVenues || [];
  const venueCount = overview?.venueCount || 0;

  // Sparkline data — fill in missing days as 0
  const dayWindow = buildDayWindow(windowDays);
  const sparkValues = dayWindow.map((d) => byDay[d] || 0);
  const maxSpark = Math.max(1, ...sparkValues);

  // Provider rows sorted by count desc
  const providerRows = Object.entries(byProvider).sort((a, b) => b[1] - a[1]);
  const providerTotal = providerRows.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="md:text-4xl text-3xl font-bold text-[#FFFFFF]"
            style={{ ...outfit, letterSpacing: "0.02em" }}
          >
            Booking Attribution
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
            Every &ldquo;Book&rdquo; tap from the Pink Pineapple app, tracked across your venues.
          </p>
        </div>

        {/* Window selector */}
        <div className="flex border border-[#2A2A2A] rounded-xl overflow-hidden">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindowDays(w.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                windowDays === w.value
                  ? "bg-[#C4707E]/15 text-[#FFFFFF]"
                  : "text-[#B0B0B0] hover:text-[#FFFFFF] hover:bg-[#1A1A1A]"
              }`}
              style={inter}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex gap-3">
        <Info size={16} className="text-[#E8A0B0] flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed" style={inter}>
          <p className="text-[#FFFFFF] font-medium mb-1">
            How attribution works
          </p>
          <p className="text-[#B0B0B0]">
            When a guest taps the Book button on a venue card or detail screen,
            we log it here and append{" "}
            <code className="text-[#E8A0B0]">utm_source=pinkpineapple</code> to the
            outgoing URL. The venue&apos;s own analytics will show
            &ldquo;pinkpineapple&rdquo; as a traffic source — proof of the bookings
            we drive.
          </p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Clicks · last ${windowDays}d`}
          value={totals.recent.toLocaleString()}
          icon={<TrendingUp size={16} className="text-[#E8A0B0]" />}
          accent="#E8A0B0"
        />
        <StatCard
          label="Clicks · all time"
          value={totals.allTime.toLocaleString()}
          icon={<Activity size={16} className="text-[#C4707E]" />}
          accent="#C4707E"
        />
        <StatCard
          label="Venues in scope"
          value={venueCount.toString()}
          icon={<Building size={16} className="text-[#E8A0B0]" />}
          accent="#E8A0B0"
        />
        <StatCard
          label={`Avg per venue · ${windowDays}d`}
          value={
            venueCount > 0
              ? (totals.recent / venueCount).toFixed(1)
              : "0"
          }
          icon={<TrendingUp size={16} className="text-[#C4707E]" />}
          accent="#C4707E"
        />
      </div>

      {/* Sparkline */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-wider text-[#E8A0B0]" style={inter}>
            Daily click volume · last {windowDays} days
          </h2>
          <span className="text-[10px] text-[#6B6B6B]" style={inter}>
            Peak day: {maxSpark} click{maxSpark === 1 ? "" : "s"}
          </span>
        </div>
        {totals.recent === 0 ? (
          <div className="text-center py-12 text-[#6B6B6B] text-xs" style={inter}>
            No clicks yet in this window. Once guests start tapping &ldquo;Book&rdquo;
            in the app, this chart will populate.
          </div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {sparkValues.map((v, i) => {
              const heightPct = (v / maxSpark) * 100;
              const day = dayWindow[i];
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(2, heightPct)}%`,
                    background:
                      v > 0
                        ? "linear-gradient(180deg, #E8A0B0 0%, #8B4060 100%)"
                        : "#2A2A2A",
                  }}
                  title={`${day}: ${v} click${v === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
        )}
        {totals.recent > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-[#6B6B6B]" style={inter}>
            <span>{dayWindow[0]?.slice(5)}</span>
            <span>{dayWindow[dayWindow.length - 1]?.slice(5)}</span>
          </div>
        )}
      </div>

      {/* Provider mix + Top venues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Provider breakdown */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h2 className="text-sm uppercase tracking-wider text-[#E8A0B0] mb-4" style={inter}>
            Where the clicks went
          </h2>
          {providerRows.length === 0 ? (
            <p className="text-[#6B6B6B] text-xs italic" style={inter}>
              No clicks in this window yet.
            </p>
          ) : (
            <div className="space-y-3">
              {providerRows.map(([provider, count]) => {
                const pct = providerTotal === 0 ? 0 : (count / providerTotal) * 100;
                return (
                  <div key={provider}>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={inter}>
                      <span className="text-[#FFFFFF]">
                        {PROVIDER_LABEL[provider] || provider}
                      </span>
                      <span className="text-[#B0B0B0]">
                        {count} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0A0A0A] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #8B4060 0%, #E8A0B0 100%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top venues */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h2 className="text-sm uppercase tracking-wider text-[#E8A0B0] mb-4" style={inter}>
            Top venues by clicks
          </h2>
          {topVenues.length === 0 ? (
            <p className="text-[#6B6B6B] text-xs italic" style={inter}>
              No venues with clicks in this window yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {topVenues.map((v: any, i: number) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[#2A2A2A] last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="text-xs text-[#6B6B6B] w-5 flex-shrink-0"
                      style={inter}
                    >
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium text-[#FFFFFF] truncate"
                        style={inter}
                      >
                        {v.name}
                      </p>
                      <p
                        className="text-[10px] text-[#6B6B6B] uppercase tracking-wider"
                        style={inter}
                      >
                        {v.area} · {PROVIDER_LABEL[v.provider] || v.provider || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold text-[#E8A0B0]"
                      style={inter}
                    >
                      {v.clicks}
                    </span>
                    <Link
                      href={`/venues/${v.id}`}
                      title="View venue"
                      className="text-[#6B6B6B] hover:text-[#E8A0B0]"
                    >
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) => (
  <div
    className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden"
    style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
  >
    <div className="h-[3px] w-full bg-gradient-to-r from-[#8B4060] to-[#E8A0B0]" />
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] text-[#B0B0B0] uppercase tracking-wider"
          style={inter}
        >
          {label}
        </p>
        {icon}
      </div>
      <p
        className="text-3xl font-bold"
        style={{ color: accent, ...outfit }}
      >
        {value}
      </p>
    </div>
  </div>
);

export default AnalyticsPage;
