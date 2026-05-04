/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Copy, X } from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };

const inputClass =
  "bg-[#000000] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-[#FFFFFF] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

const PRESETS: {
  id: string;
  label: string;
  start: string;
  end: string;
  hint?: string;
}[] = [
  { id: "breakfast", label: "Breakfast (8am–2pm)", start: "08:00", end: "14:00" },
  { id: "brunch", label: "Brunch", start: "09:00", end: "14:00" },
  { id: "lunch", label: "Lunch", start: "11:00", end: "15:00" },
  {
    id: "lunch-dinner",
    label: "Lunch + Dinner (11am–midnight)",
    start: "11:00",
    end: "00:00",
  },
  {
    id: "dinner",
    label: "Dinner (5pm–midnight)",
    start: "17:00",
    end: "00:00",
  },
  {
    id: "all-day",
    label: "All Day (8am–midnight)",
    start: "08:00",
    end: "00:00",
  },
  {
    id: "club",
    label: "Club Hours (10pm–4am)",
    start: "22:00",
    end: "04:00",
  },
];

type DayValue = { closed: boolean; start: string; end: string };

export type OpeningHoursValue = Record<DayKey, DayValue>;

type Props = {
  value: OpeningHoursValue;
  onChange: (next: OpeningHoursValue) => void;
};

export const blankOpeningHours = (): OpeningHoursValue => ({
  mon: { closed: false, start: "10:00", end: "22:00" },
  tue: { closed: false, start: "10:00", end: "22:00" },
  wed: { closed: false, start: "10:00", end: "22:00" },
  thu: { closed: false, start: "10:00", end: "22:00" },
  fri: { closed: false, start: "10:00", end: "22:00" },
  sat: { closed: false, start: "10:00", end: "22:00" },
  sun: { closed: false, start: "10:00", end: "22:00" },
});

/// Convert OpeningHoursValue into the JSON shape the backend stores:
///   { mon: "10:00-22:00", tue: "closed", ... }
/// (matches BEACH_CLUB_HOURS / RESTAURANT_HOURS / GYM_HOURS in seed-venues.ts)
export const serializeOpeningHours = (
  v: OpeningHoursValue
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const day of DAYS) {
    const d = v[day.key];
    out[day.key] = d.closed ? "closed" : `${d.start}-${d.end}`;
  }
  return out;
};

/// Inverse — read the backend JSON shape back into the picker value.
export const parseOpeningHours = (raw: any): OpeningHoursValue => {
  const result = blankOpeningHours();
  if (!raw || typeof raw !== "object") return result;
  for (const day of DAYS) {
    const v = raw[day.key];
    if (typeof v !== "string") continue;
    if (v.toLowerCase() === "closed") {
      result[day.key] = { ...result[day.key], closed: true };
      continue;
    }
    const m = v.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    if (m) {
      result[day.key] = { closed: false, start: m[1], end: m[2] };
    }
  }
  return result;
};

const OpeningHoursPicker = ({ value, onChange }: Props) => {
  const [selectedDays, setSelectedDays] = useState<Set<DayKey>>(
    () => new Set(DAYS.map((d) => d.key))
  );

  const toggleDay = (k: DayKey) => {
    const next = new Set(selectedDays);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelectedDays(next);
  };

  const selectAll = () => setSelectedDays(new Set(DAYS.map((d) => d.key)));
  const selectWeekdays = () =>
    setSelectedDays(new Set(["mon", "tue", "wed", "thu", "fri"]));
  const selectWeekend = () => setSelectedDays(new Set(["sat", "sun"]));
  const selectNone = () => setSelectedDays(new Set());

  const applyPreset = (start: string, end: string) => {
    const next = { ...value };
    for (const k of selectedDays) {
      next[k] = { closed: false, start, end };
    }
    onChange(next);
  };

  const markClosed = () => {
    const next = { ...value };
    for (const k of selectedDays) {
      next[k] = { ...next[k], closed: true };
    }
    onChange(next);
  };

  const updateDay = (k: DayKey, patch: Partial<DayValue>) => {
    onChange({ ...value, [k]: { ...value[k], ...patch } });
  };

  const copyDay = (from: DayKey) => {
    const next = { ...value };
    for (const d of DAYS) {
      if (d.key !== from) next[d.key] = { ...value[from] };
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div>
        <p
          className="text-[11px] text-[#B0B0B0] mb-2 uppercase tracking-wider"
          style={inter}
        >
          1. Pick the days to apply a preset to
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {DAYS.map((d) => {
            const active = selectedDays.has(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDay(d.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                  active
                    ? "text-white border-[#C4707E] bg-[#C4707E]/20"
                    : "text-[#6B6B6B] border-[#2A2A2A] hover:text-white"
                }`}
                style={inter}
              >
                {d.label.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 text-[10px]" style={inter}>
          <button
            type="button"
            onClick={selectAll}
            className="text-[#E8A0B0] hover:text-white"
          >
            All
          </button>
          <span className="text-[#3A3A3A]">·</span>
          <button
            type="button"
            onClick={selectWeekdays}
            className="text-[#E8A0B0] hover:text-white"
          >
            Weekdays
          </button>
          <span className="text-[#3A3A3A]">·</span>
          <button
            type="button"
            onClick={selectWeekend}
            className="text-[#E8A0B0] hover:text-white"
          >
            Weekend
          </button>
          <span className="text-[#3A3A3A]">·</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-[#6B6B6B] hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Preset buttons */}
      <div>
        <p
          className="text-[11px] text-[#B0B0B0] mb-2 uppercase tracking-wider"
          style={inter}
        >
          2. Apply a time preset
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={selectedDays.size === 0}
              onClick={() => applyPreset(p.start, p.end)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[#2A2A2A] text-[#B0B0B0] hover:text-white hover:border-[#C4707E]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={inter}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            disabled={selectedDays.size === 0}
            onClick={markClosed}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-red-400/30 text-red-300 hover:bg-red-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={inter}
          >
            Mark Closed
          </button>
        </div>
      </div>

      {/* Per-day grid (review + override) */}
      <div>
        <p
          className="text-[11px] text-[#B0B0B0] mb-2 uppercase tracking-wider"
          style={inter}
        >
          3. Review each day (override individually if needed)
        </p>
        <div className="rounded-xl border border-[#2A2A2A] divide-y divide-[#2A2A2A] bg-[#0A0A0A]">
          {DAYS.map((d) => {
            const v = value[d.key];
            return (
              <div
                key={d.key}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <span
                  className="text-xs text-white font-medium w-20"
                  style={inter}
                >
                  {d.label}
                </span>
                {v.closed ? (
                  <span
                    className="flex-1 text-xs text-red-300 italic"
                    style={inter}
                  >
                    Closed
                  </span>
                ) : (
                  <>
                    <input
                      type="time"
                      value={v.start}
                      onChange={(e) =>
                        updateDay(d.key, { start: e.target.value })
                      }
                      className={inputClass + " w-24"}
                      style={inter}
                    />
                    <span className="text-[#6B6B6B] text-xs">to</span>
                    <input
                      type="time"
                      value={v.end}
                      onChange={(e) =>
                        updateDay(d.key, { end: e.target.value })
                      }
                      className={inputClass + " w-24"}
                      style={inter}
                    />
                  </>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => copyDay(d.key)}
                    title="Copy this day's hours to all other days"
                    className="text-[#6B6B6B] hover:text-[#E8A0B0] transition-colors"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDay(d.key, { closed: !v.closed })
                    }
                    className="text-[10px] text-[#6B6B6B] hover:text-white px-1.5 py-0.5 rounded border border-[#2A2A2A]"
                    style={inter}
                  >
                    {v.closed ? "Re-open" : "Closed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OpeningHoursPicker;
