import express, { Request, Response } from "express";
import prisma from "../../../shared/prisma";

const router = express.Router();
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const SERVICE_STARTED_AT = new Date();

// Lightweight liveness probe — returns 200 fast without touching the
// database. Use this for load-balancer health checks where you only
// care that the process is up and accepting connections.
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "pink-pineapple-backend",
    version: SERVICE_VERSION,
    uptime_seconds: Math.round(
      (Date.now() - SERVICE_STARTED_AT.getTime()) / 1000
    ),
    timestamp: new Date().toISOString(),
  });
});

// Deep readiness probe — verifies MongoDB connectivity by running a
// trivial Prisma query. Returns 503 if the DB is unreachable so external
// monitors can distinguish "process is up but service is degraded".
router.get("/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {};
  let allOk = true;

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.user.count();
    checks.database = { ok: true, latency_ms: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = {
      ok: false,
      latency_ms: Date.now() - dbStart,
      error: err?.message || String(err),
    };
    allOk = false;
  }

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    service: "pink-pineapple-backend",
    version: SERVICE_VERSION,
    uptime_seconds: Math.round(
      (Date.now() - SERVICE_STARTED_AT.getTime()) / 1000
    ),
    timestamp: new Date().toISOString(),
    checks,
  });
});

export const HealthRoutes = router;
