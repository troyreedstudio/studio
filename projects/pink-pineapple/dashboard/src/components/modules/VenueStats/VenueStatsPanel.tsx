/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useGetOwnedVenuesQuery,
  useGetVenueStatsQuery,
} from "@/redux/features/venues/venuesApi";
import { Star, Heart, Flame, Activity } from "lucide-react";
import { useEffect, useState } from "react";

const outfit = { fontFamily: "Outfit, sans-serif" };
const poppins = { fontFamily: "Poppins, sans-serif" };

const crowdShort = ["Empty", "Chill", "Filling", "Packed", "Capped"];
const musicShort = ["Silent", "Background", "Good", "Great", "Incredible"];
const energyShort = ["Dead", "Mellow", "Warming", "Lit", "Fire"];

const formatRelative = (iso?: string) => {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const VenueStatsPanel = () => {
  const { data: ownedData, isLoading: ownedLoading } = useGetOwnedVenuesQuery(undefined);
  const venues = ownedData?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && venues.length > 0) setSelectedId(venues[0].id);
  }, [venues, selectedId]);

  const { data: statsData, isLoading: statsLoading } = useGetVenueStatsQuery(
    selectedId,
    { skip: !selectedId }
  );
  const stats = statsData?.data;

  if (ownedLoading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 text-[#B0B0B0]" style={poppins}>
        Loading your venues…
      </div>
    );
  }

  if (venues.length === 0) {
    // Don't render the panel for non-venue-owners.
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2
          className="text-xl font-bold italic text-white"
          style={{ ...outfit, letterSpacing: "0.5px" }}
        >
          Venue performance
        </h2>
        {venues.length > 1 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm rounded-lg px-3 py-2"
            style={poppins}
          >
            {venues.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {statsLoading || !stats ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 text-[#B0B0B0]" style={poppins}>
          Loading stats…
        </div>
      ) : (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<span className="text-lg">🍍</span>}
              label="Pink Pineapple rating"
              primary={
                stats.ppRating != null
                  ? Number(stats.ppRating).toFixed(1)
                  : "—"
              }
              secondary={`${stats.ppRatingCount ?? 0} review${stats.ppRatingCount === 1 ? "" : "s"}`}
              color="#E8A0B0"
            />
            <MetricCard
              icon={<Star size={18} className="text-[#FFB800]" />}
              label="Google rating"
              primary={
                stats.googleRating != null
                  ? Number(stats.googleRating).toFixed(1)
                  : "—"
              }
              secondary={`${stats.googleRatingCount ?? 0} on Google`}
              color="#FFB800"
            />
            <MetricCard
              icon={<Heart size={18} className="text-[#C4707E]" />}
              label="Favourited by"
              primary={String(stats.favoritesCount ?? 0)}
              secondary="users"
              color="#C4707E"
            />
            <MetricCard
              icon={<Flame size={18} className="text-[#E8A0B0]" />}
              label="Vibe right now"
              primary={
                stats.recentVibe
                  ? `${stats.recentVibe.count} report${stats.recentVibe.count === 1 ? "" : "s"}`
                  : "—"
              }
              secondary={
                stats.recentVibe
                  ? `${crowdShort[stats.recentVibe.crowd]} · ${musicShort[stats.recentVibe.music]} · ${energyShort[stats.recentVibe.energy]}`
                  : "no recent vibes"
              }
              color="#E8A0B0"
            />
          </div>

          {/* Recent ratings + vibes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🍍</span>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider" style={poppins}>
                  Recent Pink Pineapple ratings
                </h3>
              </div>
              {stats.recentRatings?.length === 0 ? (
                <p className="text-[#6B6B6B] text-sm" style={poppins}>
                  No ratings yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {stats.recentRatings?.map((r: any) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between border-b border-[#2A2A2A] last:border-b-0 pb-2 last:pb-0"
                    >
                      <span className="text-[#E8A0B0] text-base font-bold" style={poppins}>
                        {r.score} ★
                      </span>
                      <span className="text-[#B0B0B0] text-xs" style={poppins}>
                        {formatRelative(r.updatedAt || r.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-[#E8A0B0]" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider" style={poppins}>
                  Recent vibe checks
                </h3>
              </div>
              {stats.recentVibes?.length === 0 ? (
                <p className="text-[#6B6B6B] text-sm" style={poppins}>
                  No vibe checks yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {stats.recentVibes?.map((v: any) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 border-b border-[#2A2A2A] last:border-b-0 pb-2 last:pb-0"
                    >
                      <span className="text-[#E8A0B0] text-xs font-medium" style={poppins}>
                        {crowdShort[v.crowd]} · {musicShort[v.music]} · {energyShort[v.energy]}
                      </span>
                      <span className="text-[#B0B0B0] text-xs" style={poppins}>
                        {formatRelative(v.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  primary,
  secondary,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  color: string;
}) => (
  <div
    className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden"
    style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)" }}
  >
    <div className="h-[3px] w-full bg-gradient-to-r from-[#8B4060] to-[#E8A0B0]" />
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#B0B0B0] text-[10px] uppercase tracking-wider" style={poppins}>
          {label}
        </p>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color, ...outfit }}>
        {primary}
      </p>
      <p className="text-[#6B6B6B] text-xs mt-1" style={poppins}>
        {secondary}
      </p>
    </div>
  </div>
);

export default VenueStatsPanel;
