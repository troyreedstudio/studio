/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState, useEffect } from "react";
import { Video, X, ExternalLink } from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };

interface Props {
  // Existing video URL on the server (Edit Event flow). Shown as a
  // preview with a "Replace" affordance.
  existingUrl?: string;
  // Currently-picked-but-not-yet-uploaded File (Create / Edit
  // pending-save). Shown via object URL preview.
  pickedFile: File | null;
  onFilePicked: (file: File | null) => void;
  // Soft validation: warn (not block) when over these limits.
  // Cloudinary still accepts the upload, but the user is signalling
  // the video is heavier than the ideal-spec range we set.
  softMaxSeconds?: number;
  softMaxMB?: number;
}

// Drop-in replacement for the old paste-a-URL text input on
// Featured Event create + edit. Editors can pick a local mp4/mov/webm
// (or drag-and-drop), see a preview, then save — the form's existing
// multipart submit pushes the file to /events with field "eventVideo".
// Backend uploads to Cloudinary via the existing fileUploader.
const VideoPicker = ({
  existingUrl,
  pickedFile,
  onFilePicked,
  softMaxSeconds = 30,
  softMaxMB = 25,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(
    null
  );
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!pickedFile) {
      setPreviewUrl(null);
      setDimensions(null);
      setDurationSec(null);
      return;
    }
    const url = URL.createObjectURL(pickedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pickedFile]);

  const handlePick = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      alert("Please pick a video file (mp4, mov, webm).");
      return;
    }
    onFilePicked(f);
  };

  const onMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setDimensions({ w: v.videoWidth, h: v.videoHeight });
    setDurationSec(Math.round(v.duration));
  };

  const sizeMB = pickedFile
    ? Math.round((pickedFile.size / (1024 * 1024)) * 10) / 10
    : null;
  const portraitOK =
    dimensions && dimensions.h > dimensions.w
      ? true
      : dimensions
        ? false
        : null;
  const overDuration =
    durationSec !== null && durationSec > softMaxSeconds;
  const overSize = sizeMB !== null && sizeMB > softMaxMB;

  return (
    <div className="space-y-3">
      {/* Existing-on-server preview when no new file is staged */}
      {!pickedFile && existingUrl && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[#B0B0B0]" style={inter}>
              Current video
            </p>
            <a
              href={existingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#E8A0B0] hover:underline"
              style={inter}
            >
              <ExternalLink size={10} />
              Open
            </a>
          </div>
          <video
            src={existingUrl}
            muted
            playsInline
            controls
            className="w-full rounded-lg max-h-[200px] bg-black"
          />
        </div>
      )}

      {/* Picked-but-not-yet-saved preview */}
      {pickedFile && previewUrl && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-white" style={inter}>
              New video, ready to upload on save
            </p>
            <button
              type="button"
              onClick={() => onFilePicked(null)}
              className="inline-flex items-center gap-1 text-[10px] text-[#B0B0B0] hover:text-white"
              style={inter}
            >
              <X size={12} />
              Remove
            </button>
          </div>
          <video
            src={previewUrl}
            muted
            playsInline
            controls
            onLoadedMetadata={onMetadata}
            className="w-full rounded-lg max-h-[240px] bg-black"
          />
          <div className="grid grid-cols-3 gap-2 text-[10px]" style={inter}>
            <div
              className={`rounded-md px-2 py-1 ${
                portraitOK === false
                  ? "bg-yellow-500/10 text-yellow-300"
                  : "bg-[#1A1A1A] text-[#B0B0B0]"
              }`}
            >
              {dimensions
                ? `${dimensions.w} × ${dimensions.h}${
                    portraitOK === false ? " · landscape" : " · portrait ✓"
                  }`
                : "Dimensions…"}
            </div>
            <div
              className={`rounded-md px-2 py-1 ${
                overDuration
                  ? "bg-yellow-500/10 text-yellow-300"
                  : "bg-[#1A1A1A] text-[#B0B0B0]"
              }`}
            >
              {durationSec !== null
                ? `${durationSec}s${overDuration ? ` · over ${softMaxSeconds}s` : ""}`
                : "Duration…"}
            </div>
            <div
              className={`rounded-md px-2 py-1 ${
                overSize
                  ? "bg-yellow-500/10 text-yellow-300"
                  : "bg-[#1A1A1A] text-[#B0B0B0]"
              }`}
            >
              {sizeMB !== null
                ? `${sizeMB}MB${overSize ? ` · over ${softMaxMB}MB` : ""}`
                : ""}
            </div>
          </div>
        </div>
      )}

      {/* Drop zone / picker */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handlePick(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#E8A0B0] bg-[#E8A0B0]/5"
            : "border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]"
        }`}
      >
        <Video size={20} className="mx-auto text-[#6B6B6B] mb-1" />
        <p className="text-xs text-white" style={inter}>
          {pickedFile
            ? "Pick a different video"
            : existingUrl
              ? "Replace video"
              : "Drop a video here or click to browse"}
        </p>
        <p className="text-[10px] text-[#6B6B6B] mt-1" style={inter}>
          9:16 vertical, ≤ {softMaxSeconds}s ideal · mp4 / mov / webm
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(e) => handlePick(e.target.files)}
        />
      </div>
    </div>
  );
};

export default VideoPicker;
