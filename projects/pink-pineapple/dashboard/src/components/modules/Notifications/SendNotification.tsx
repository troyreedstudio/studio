/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useSendBroadcastMutation } from "@/redux/features/notifications/notifications.api";

const outfit = { fontFamily: "Outfit, sans-serif" };
const poppins = { fontFamily: "Poppins, sans-serif" };

// Push-notification broadcast composer. Audience is implicit "all users
// with a registered FCM token" — segmentation (by area, by saved venue,
// etc.) is a v1.4+ follow-up per Troy's "ship the simple thing first"
// decision (2026-05-31). Title 80 char cap matches iOS lock-screen
// truncation; body 200 char cap stays inside Android notification limits
// before "... show more" appears.
const TITLE_MAX = 80;
const BODY_MAX = 200;

const SendNotification = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendBroadcast, { isLoading }] = useSendBroadcastMutation();

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    body.length <= BODY_MAX &&
    !isLoading;

  const handleSend = async () => {
    if (!canSend) return;
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
      toast.error(
        err?.data?.message || "Failed to send broadcast.",
        { id: toastId }
      );
    }
  };

  return (
    <div className="max-w-2xl">
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
            {title.length > TITLE_MAX && " — too long, will be truncated on lock screen"}
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
            {body.length > BODY_MAX && " — too long, will be truncated"}
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

        {/* Send */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              ...poppins,
              background:
                "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            <Send size={16} />
            {isLoading ? "Sending…" : "Send broadcast"}
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-5 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 space-y-2">
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
            There&apos;s no undo. Once sent, it&apos;s on every device.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SendNotification;
