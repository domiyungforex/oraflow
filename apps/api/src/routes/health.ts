import { Router, Request, Response } from "express";
import { db } from "@orderflow/db";

const router = Router();

// GET /api/v1/health
router.get("/", async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Database check
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
    };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "healthy")
    ? "healthy"
    : "degraded";

  res.status(overallStatus === "healthy" ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// GET /api/v1/health/ready
router.get("/ready", async (req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not ready" });
  }
});

// GET /api/v1/health/live
router.get("/live", (req: Request, res: Response) => {
  res.json({ status: "alive" });
});

export { router as healthRoutes };
