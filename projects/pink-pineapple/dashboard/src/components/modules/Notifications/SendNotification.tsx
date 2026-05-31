/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Send, CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import {
  useSendBroadcastMutation,
  useScheduleBroadcastMutation,
  useListScheduledQuery,
  useCancelScheduledMutation,
} from "@/redux/features/notifications/notifications.api";

const outfit = { fontFamily: "Outfit, sans-serif" };
const poppins = { fontFamily: "Poppins, sans-serif" };

// Push-notification composer. Two modes:
//   • Send now — fires immediately via /notifications/broadcast
//   • Schedule — queues at /notifications/schedule; backend worker
//     ticks every 60s and fans out due rows. Cancellable from the
//     audit list below up until the worker picks it up.
//
// Audience is still implicit "all users with a registered FCM token".
// Segmentation (by area, by saved venue) is the v1.4+ follow-up.
const TITLE_MAX = 80;
const BODY_MAX = 200;

const SendNotification = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [scheduledFor, setScheduledFor] = useState<string>(() => {
    // Default: tomorrow at 19:00 local — most likely use case is
    // "tonight at 7pm" style nightlife pushes that the editor sets
    // up earlier in the day.
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    // <input type="datetime-local"> wants YYYY-MM-DDTHH:mm without tz
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [sendBroadcast, { isLoading: sendingNow }] = useSendBroadcastMutation();
  const [scheduleBroadcast, { isLoading: scheduling }] =
    useScheduleBroadcastMutation();
  const { data: scheduledList } = useListScheduledQuery({});
  const [cancelScheduled] = useCancelScheduledMutation();

  const isLoading = sendingNow || scheduling;

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    body.length <= BODY_MAX &&
    (mode === "now" || scheduledFor) &&
    !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (mode === "now") {
      const confirmMsg = `Send to ALL Pink Pineapple users who have notifications enabled?\n\n"${title.trim()}"\n${body.trim()}`;
      if (!window.confirm(confirmMsg)) return;
      const toastId = toast.loading("Sending broadcast…");
      try {
        const res: any = await sendBroadcast({
          title: title.trim(),
          body: body.trim(),
        }).unwrap();
        const data = res?.data || res;
        const success = data?.successCount ?? 0;
        const failure = data?.failureCount ?? 0;
        toast.success(
          `Sent to ${success} device${success === 1 ? "" : "s"}${failure ? ` (${failure} failed)` : ""}.`,
          { id: toastId }
        );
        setTitle("");
        setBody("");
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to send broadcast.", {
          id: toastId,
        });
      }
    } else {
      // Schedule path. Convert datetime-local (no tz) → ISO with
      // user's local offset so the backend stores the right instant.
      const when = new Date(scheduledFor);
      const toastId = toast.loading("Scheduling broadcast…");
      try {
        await scheduleBroadcast({
          title: title.trim(),
          body: body.trim(),
          scheduledFor: when.toISOString(),
        }).unwrap();
        toast.success(`Scheduled for ${when.toLocaleString()}.`, {
          id: toastId,
        });
        setTitle("");
        setBody("");
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to schedule.", {
          id: toastId,
        });
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this scheduled notification?")) return;
    const toastId = toast.loading("Cancelling…");
    try {
      await cancelScheduled(id).unwrap();
      toast.success("Cancelled.", { id: toastId });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to cancel.", { id: toastId });
    }
  };

  const rows = (scheduledList?.data || []) as any[];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] p-6 space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <label
            className="text-xs uppercase tracking-widest text-[#B0B0B0]"
            style={poppins}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX + 20}
            placeholder="Tonight at Mesa: Bali Sunday tribute"
            className="w-full rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3 text-sm text-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors"
            style={poppins}
          />
          <p
            className={`text-[11px] ${
              title.length > TITLE_MAX ? "text-red-400" : "text-[#6B6B6B]"
            }`}
            style={poppins}
          >
            {title.length} / {TITLE_MAX}
            {title.length > TITLE_MAX && " — too long, will be truncated"}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <label
            className="text-xs uppercase tracking-widest text-[#B0B0B0]"
            style={poppins}
          >
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX + 50}
            rows={4}
            placeholder="Doors 9pm, free entry before 11. Tap to see the lineup."
            className="w-full rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3 text-sm text-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E] transition-colors resize-y"
            style={poppins}
          />
          <p
            className={`text-[11px] ${
              body.length > BODY_MAX ? "text-red-400" : "text-[#6B6B6B]"
            }`}
            style={poppins}
          >
            {body.length} / {BODY_MAX}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="space-y-2">
          <label
            className="text-xs uppercase tracking-widest text-[#B0B0B0]"
            style={poppins}
          >
            When
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("now")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                mode === "now"
                  ? "bg-[#C4707E]/15 text-white border border-[#C4707E]"
                  : "bg-[#1A1A1A] text-[#B0B0B0] border border-[#2A2A2A] hover:border-[#3A3A3A]"
              }`}
              style={poppins}
            >
              Send now
            </button>
            <button
              type="button"
              onClick={() => setMode("later")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                mode === "later"
                  ? "bg-[#C4707E]/15 text-white border border-[#C4707E]"
                  : "bg-[#1A1A1A] text-[#B0B0B0] border border-[#2A2A2A] hover:border-[#3A3A3A]"
              }`}
              style={poppins}
            >
              Schedule
            </button>
          </div>
          {mode === "later" && (
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C4707E] transition-colors mt-2"
              style={poppins}
            />
          )}
          <p className="text-[11px] text-[#6B6B6B]" style={poppins}>
            {mode === "now"
              ? "Fires the moment you confirm."
              : "Queued. The backend worker checks every 60 seconds and fires when the time arrives. You can cancel below until then."}
          </p>
        </div>

        {/* Audience badge */}
        <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3">
          <p
            className="text-[11px] uppercase tracking-widest text-[#6B6B6B] mb-1"
            style={poppins}
          >
            Audience
          </p>
          <p className="text-sm text-white" style={poppins}>
            All users with notifications enabled
          </p>
          <p className="text-[11px] text-[#6B6B6B] mt-1" style={poppins}>
            Segmentation (by area, by saved venue) coming in v1.4.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              ...poppins,
              background:
                "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            {mode === "now" ? <Send size={16} /> : <CalendarClock size={16} />}
            {isLoading
              ? mode === "now"
                ? "Sending…"
                : "Scheduling…"
              : mode === "now"
                ? "Send broadcast"
                : "Schedule broadcast"}
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 space-y-2">
        <p
          className="text-xs uppercase tracking-widest text-[#B0B0B0]"
          style={{ ...outfit, letterSpacing: "0.08em" }}
        >
          A few rules of thumb
        </p>
        <ul
          className="text-[12px] text-[#B0B0B0] leading-relaxed list-disc ml-5 space-y-1"
          style={poppins}
        >
          <li>Send sparingly. Two pushes a week max, ideally fewer.</li>
          <li>
            Tie it to a moment — &quot;tonight&quot;, &quot;this weekend&quot;,
            a specific venue. Generic &quot;check out the app&quot; pushes
            train people to mute notifications.
          </li>
          <li>
            Schedule ahead for tonight&apos;s peak hours (~7-8pm SGT) so
            you&apos;re not racing the clock.
          </li>
          <li>
            There&apos;s no undo once a push has fired. Cancel scheduled
            ones below if you change your mind.
          </li>
        </ul>
      </div>

      {/* Scheduled list */}
      <div className="space-y-3">
        <h2
          className="text-sm uppercase tracking-widest text-[#E8A0B0]"
          style={{ ...outfit, letterSpacing: "0.08em" }}
        >
          Scheduled + recent
        </h2>
        {rows.length === 0 ? (
          <div
            className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-[12px] text-[#6B6B6B]"
            style={poppins}
          >
            No scheduled notifications yet. Anything you schedule will appear
            here with cancel + send-status.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row: any) => {
              const when = row.scheduledFor
                ? new Date(row.scheduledFor)
                : null;
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm text-white font-medium truncate"
                        style={poppins}
                      >
                        {row.title}
                      </p>
                      <p
                        className="text-[12px] text-[#B0B0B0] mt-1 line-clamp-2"
                        style={poppins}
                      >
                        {row.body}
                      </p>
                    </div>
                    <StatusPill status={row.status} />
                  </div>
                  <div
                    className="flex items-center justify-between text-[11px] text-[#6B6B6B]"
                    style={poppins}
                  >
                    <span>
                      {when ? when.toLocaleString() : "—"}
                      {row.status === "SENT" && row.successCount !== undefined
                        ? ` · sent to ${row.successCount}${
                            row.failureCount
                              ? ` (${row.failureCount} failed)`
                              : ""
                          }`
                        : ""}
                      {row.status === "FAILED" && row.errorMessage
                        ? ` · ${row.errorMessage}`
                        : ""}
                    </span>
                    {row.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(row.id)}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    SENT: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    FAILED: "bg-red-500/10 text-red-300 border-red-500/30",
    CANCELLED: "bg-[#2A2A2A] text-[#B0B0B0] border-[#2A2A2A]",
  };
  return (
    <span
      className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${styles[status] || styles.PENDING}`}
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {status}
    </span>
  );
};

export default SendNotification;
