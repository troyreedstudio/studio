/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import Spinner from "@/components/common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useListVipBookingsQuery,
  VipBookingStatus,
} from "@/redux/features/vipBookings/vipBookings.api";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Outfit, sans-serif" };

const STATUS_OPTIONS: { value: VipBookingStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SENT_TO_VENUE", label: "Sent to venue" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    SENT_TO_VENUE: "text-blue-400 bg-blue-400/10",
    CONFIRMED: "text-cyan-400 bg-cyan-400/10",
    PAID: "text-emerald-400 bg-emerald-400/10",
    CANCELLED: "text-red-400 bg-red-400/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

const statusLabel = (status: string) => {
  if (status === "SENT_TO_VENUE") return "Sent to venue";
  if (status === "PENDING") return "Pending";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PAID") return "Paid";
  if (status === "CANCELLED") return "Cancelled";
  return status;
};

const formatDate = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Short reference code shown in the table and in the WhatsApp message —
// last 8 chars of the ObjectId, uppercased, prefixed PP-. Matches the
// backend's createRequest response so support staff can lookup quickly.
const reference = (id: string) =>
  `PP-${(id || "").slice(-8).toUpperCase()}`;

export default function VipBookingsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<VipBookingStatus | "">("");
  const { data, isLoading } = useListVipBookingsQuery(filter || undefined);
  const requests: any[] = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
            style={{ ...playfair, letterSpacing: "0.02em" }}
          >
            VIP Bookings
          </h1>
          <p className="mt-1 text-sm text-[#B0B0B0]" style={inter}>
            VIP table requests captured from the Pink Pineapple app.
            Update each request as it progresses with the venue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B6B6B]" style={inter}>
          <Crown size={14} className="text-[#E8A0B0]" />
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value || "all"}
            onClick={() => setFilter(opt.value as any)}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider transition-colors ${
              filter === opt.value
                ? "bg-[#E8A0B0] text-[#000000]"
                : "bg-[#1A1A1A] text-[#B0B0B0] hover:bg-[#2A2A2A]"
            }`}
            style={inter}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div
          className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-12 text-center"
          style={inter}
        >
          <Info className="mx-auto mb-3 text-[#6B6B6B]" size={32} />
          <p className="text-sm text-[#B0B0B0]">
            No VIP requests {filter ? `with status "${statusLabel(filter)}"` : "yet"}.
          </p>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Requests appear here when users tap &ldquo;Book VIP Table&rdquo;
            in the app.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#2A2A2A] hover:bg-transparent">
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Ref
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Venue
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Party
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Area
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-[#B0B0B0] text-xs uppercase tracking-wider">
                  Received
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => router.push(`/vip-bookings/${r.id}`)}
                  className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] cursor-pointer"
                >
                  <TableCell
                    className="text-[#E8A0B0] font-mono text-xs"
                    style={inter}
                  >
                    {reference(r.id)}
                  </TableCell>
                  <TableCell className="text-white" style={inter}>
                    <div>
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="text-xs text-[#6B6B6B]">{r.phone}</div>
                  </TableCell>
                  <TableCell className="text-white" style={inter}>
                    {r.venue?.name || "—"}
                  </TableCell>
                  <TableCell className="text-[#B0B0B0]" style={inter}>
                    {formatDate(r.eventDate)}
                    <div className="text-xs text-[#6B6B6B]">
                      {r.arrivalTime}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#B0B0B0]" style={inter}>
                    {r.partySize}
                  </TableCell>
                  <TableCell
                    className="text-[#B0B0B0] max-w-[200px] truncate"
                    style={inter}
                    title={r.requestedArea}
                  >
                    {r.requestedArea}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider ${statusBadge(
                        r.status
                      )}`}
                      style={inter}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#6B6B6B] text-xs" style={inter}>
                    {formatDate(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
