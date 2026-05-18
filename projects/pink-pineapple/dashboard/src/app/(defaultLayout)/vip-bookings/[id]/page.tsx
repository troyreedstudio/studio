/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Spinner from "@/components/common/Spinner";
import { ArrowLeft, Crown, ExternalLink } from "lucide-react";
import {
  useGetVipBookingQuery,
  useUpdateVipBookingMutation,
  VipBookingStatus,
} from "@/redux/features/vipBookings/vipBookings.api";

const inter = { fontFamily: "Inter, sans-serif" };
const playfair = { fontFamily: "Outfit, sans-serif" };

const STATUS_OPTIONS: { value: VipBookingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "SENT_TO_VENUE", label: "Sent to venue" },
  { value: "CONFIRMED", label: "Venue confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

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

const formatDateTime = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

const reference = (id: string) =>
  `PP-${(id || "").slice(-8).toUpperCase()}`;

export default function VipBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data, isLoading } = useGetVipBookingQuery(id, { skip: !id });
  const [updateRequest, { isLoading: isSaving }] = useUpdateVipBookingMutation();

  const r: any = data?.data;

  const [status, setStatus] = useState<VipBookingStatus>("PENDING");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (r) {
      setStatus(r.status);
      setPaymentUrl(r.paymentUrl || "");
      setInternalNotes(r.internalNotes || "");
    }
  }, [r]);

  if (isLoading) return <Spinner />;
  if (!r)
    return (
      <div className="py-16 text-center text-[#B0B0B0]" style={inter}>
        Request not found.
      </div>
    );

  const handleSave = async () => {
    const toastId = toast.loading("Saving...");
    try {
      await updateRequest({
        id,
        data: { status, paymentUrl, internalNotes },
      }).unwrap();
      toast.success("Request updated", { id: toastId });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update", { id: toastId });
    }
  };

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div
        className="text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-1"
        style={inter}
      >
        {label}
      </div>
      <div className="text-sm text-white" style={inter}>
        {value || "—"}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push("/vip-bookings")}
        className="flex items-center gap-2 text-xs text-[#B0B0B0] hover:text-white transition-colors"
        style={inter}
      >
        <ArrowLeft size={14} /> Back to VIP Bookings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Crown size={18} className="text-[#E8A0B0]" />
            <span
              className="font-mono text-xs text-[#E8A0B0]"
              style={inter}
            >
              {reference(r.id)}
            </span>
          </div>
          <h1
            className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
            style={{ ...playfair, letterSpacing: "0.02em" }}
          >
            VIP Table at {r.venue?.name || "Unknown venue"}
          </h1>
          <p
            className="mt-1 text-xs text-[#6B6B6B]"
            style={inter}
          >
            Received {formatDateTime(r.createdAt)}
          </p>
        </div>
      </div>

      {/* Customer + booking details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5 space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Customer
          </h2>
          <Field label="Name" value={`${r.firstName} ${r.lastName}`} />
          <Field label="Phone" value={r.phone} />
          <Field label="Email" value={r.email} />
          <Field label="Instagram" value={r.instagram} />
        </div>

        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5 space-y-4">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0]"
            style={inter}
          >
            Booking
          </h2>
          <Field label="Venue" value={r.venue?.name} />
          <Field label="Event Date" value={formatDate(r.eventDate)} />
          <Field label="Arrival Time" value={r.arrivalTime} />
          <Field label="Party Size" value={r.partySize} />
          <Field label="Requested Area" value={r.requestedArea} />
          <Field label="Minimum Price" value={r.minimumPrice} />
          <Field
            label="Deposit Choice"
            value={
              r.depositChoice === "FIFTY_PERCENT"
                ? "50% deposit"
                : r.depositChoice === "FULL"
                  ? "Pay in full"
                  : r.depositChoice
            }
          />
        </div>
      </div>

      {/* Floor plan, if venue has one */}
      {r.venue?.floorPlanUrl && (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5">
          <h2
            className="text-sm uppercase tracking-wider text-[#E8A0B0] mb-3"
            style={inter}
          >
            Venue floor plan
          </h2>
          <a
            href={r.venue.floorPlanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.venue.floorPlanUrl}
              alt={`${r.venue.name} floor plan`}
              className="w-full rounded-md border border-[#1A1A1A]"
            />
          </a>
        </div>
      )}

      {/* Workflow controls */}
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5 space-y-5">
        <h2
          className="text-sm uppercase tracking-wider text-[#E8A0B0]"
          style={inter}
        >
          Workflow
        </h2>

        <div>
          <label
            className="block text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-2"
            style={inter}
          >
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VipBookingStatus)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#E8A0B0]"
            style={inter}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-2"
            style={inter}
          >
            Payment URL (from the venue)
          </label>
          <input
            type="url"
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            placeholder="https://venue.example.com/pay/abc123"
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#E8A0B0]"
            style={inter}
          />
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#E8A0B0] hover:underline"
              style={inter}
            >
              Open <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div>
          <label
            className="block text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-2"
            style={inter}
          >
            Internal notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={4}
            placeholder="Anything Rowan or other admins need to know about this request..."
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#E8A0B0] resize-none"
            style={inter}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1A1A1A]">
          <button
            onClick={() => router.push("/vip-bookings")}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-[#B0B0B0] hover:text-white transition-colors disabled:opacity-50"
            style={inter}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#8B4060] via-[#C4707E] to-[#E8A0B0] text-black font-medium text-sm disabled:opacity-50"
            style={inter}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {/* Workflow timestamps */}
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-5 space-y-3">
        <h2
          className="text-sm uppercase tracking-wider text-[#E8A0B0]"
          style={inter}
        >
          Timeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Request received" value={formatDateTime(r.createdAt)} />
          <Field
            label="WhatsApp opened"
            value={formatDateTime(r.whatsappOpenedAt)}
          />
          <Field label="Sent to venue" value={formatDateTime(r.sentToVenueAt)} />
          <Field label="Confirmed" value={formatDateTime(r.confirmedAt)} />
          <Field label="Paid" value={formatDateTime(r.paidAt)} />
          <Field label="Cancelled" value={formatDateTime(r.cancelledAt)} />
        </div>
      </div>
    </div>
  );
}
