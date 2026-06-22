// LOCKED CONTRACT — every later step (Plans 02-06) implements against this exact shape.
// Do NOT change field names or status values without updating all later plans (08-01-PLAN <interfaces>).

export type BlurMode = 'gaussian' | 'pixelate';

export type BlurStatus = 'blurred' | 'no_faces' | 'failed';

export type BlurResult = {
  outputPath: string; // file:// path to the output clip
  facesBlurred: number; // count of faces blurred (telemetry)
  status: BlurStatus;
  // 'blurred'  = faces blurred; safe to deliver.
  // 'no_faces' = none found, original returned; safe to deliver.
  // 'failed'   = caller MUST use the fallback, NEVER deliver as if blurred (Pitfall 5).
};

export type BlurOptions = { radius?: number; mode?: BlurMode };

// INTERNAL (08-02): mirrors the native LmcFrameDetection/LmcDetectionResult shape.
// Telemetry/diagnostics only — NOT part of the public BlurResult contract and not
// returned by blurFaces. Native (Vision) is the source of truth; this documents
// the shape Plan 03 will consume when compositing blur onto detected face rects.
export type LmcFrameDetection = {
  /** Presentation time (seconds) the rects apply to. */
  time: number;
  /** Normalized (0..1, Vision bottom-left origin) face bounding boxes. */
  faceRects: { x: number; y: number; width: number; height: number }[];
};

export type LmcDetectionResult = {
  detections: LmcFrameDetection[];
  /** Max faces seen in any single sampled frame (the plausible people-in-shot count). */
  faceCount: number;
};
