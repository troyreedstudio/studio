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
