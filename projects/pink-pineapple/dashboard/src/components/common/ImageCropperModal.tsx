/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

const inter = { fontFamily: "Inter, sans-serif" };
const outfit = { fontFamily: "Outfit, sans-serif" };

interface Props {
  file: File;
  // Width / height ratio. Featured Event cards are 300×160 ≈ 16:9.
  // Pass `1` for square, `4 / 3` for venue hero, etc.
  aspectRatio: number;
  // Returns the cropped image as a new File (same name + extension).
  // Returns null if the user cancels.
  onClose: (cropped: File | null) => void;
}

/// Lightweight in-dashboard image crop modal. Loads any image the admin
/// just picked, lets them drag + pinch-zoom + rotate to fit the card's
/// aspect ratio, then returns a re-encoded JPEG with the chosen frame.
/// Avoids the "every image needs to be pre-sized" friction Troy flagged.
const ImageCropperModal = ({ file, aspectRatio, onClose }: Props) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Load the picked File into a data URL the Cropper component can read.
  // Done once on mount via a useEffect-style read; using an inline reader
  // keeps the modal self-contained.
  if (imageSrc === null) {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback(
    (_: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await cropImage(imageSrc, croppedAreaPixels, file.type);
      const cropped = new File([blob], file.name, {
        type: file.type || "image/jpeg",
      });
      onClose(cropped);
    } catch {
      onClose(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <div>
            <h2
              className="text-lg font-bold text-white"
              style={{ ...outfit, letterSpacing: "0.02em" }}
            >
              Position your image
            </h2>
            <p
              className="text-[11px] text-[#6B6B6B] mt-0.5"
              style={inter}
            >
              Drag to reposition, scroll or use the slider to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(null)}
            className="text-[#6B6B6B] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Crop surface */}
        <div className="relative h-[420px] bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={true}
              objectFit="contain"
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#2A2A2A]">
          <ZoomOut size={16} className="text-[#6B6B6B]" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#E8A0B0]"
          />
          <ZoomIn size={16} className="text-[#6B6B6B]" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2A2A2A]">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="px-5 py-2 rounded-xl text-sm text-[#B0B0B0] border border-[#2A2A2A] hover:text-white hover:border-[#3A3A3A] transition-colors"
            style={inter}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="px-5 py-2 rounded-xl text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              ...inter,
              background:
                "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            }}
          >
            {saving ? "Saving…" : "Use this image"}
          </button>
        </div>
      </div>
    </div>
  );
};

/// Crops the image at the given pixel rectangle and returns a JPEG Blob.
/// Uses an offscreen canvas. No external service.
const cropImage = (
  imageSrc: string,
  pixels: Area,
  mimeType: string
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(
        image,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        pixels.width,
        pixels.height
      );
      // JPEG re-encode at 92% quality keeps file size manageable while
      // staying visually lossless for photo content.
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Crop blob failed"));
          else resolve(blob);
        },
        mimeType === "image/png" ? "image/png" : "image/jpeg",
        0.92
      );
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = imageSrc;
  });

export default ImageCropperModal;
