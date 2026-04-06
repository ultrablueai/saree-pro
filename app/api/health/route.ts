import { NextResponse } from "next/server";
import { ensureDatabaseReady, getDbExecutor } from "@/lib/db";
import { cache } from "@/lib/redis";
import { HealthChecker } from "@/lib/monitoring";

// Add health checks
HealthChecker.addCheck('database', async () => {
  try {
    await ensureDatabaseReady();
    const db = await getDbExecutor();
    await db.get("SELECT 1");
    return true
  } catch {
    return false
  }
})

HealthChecker.addCheck('redis', async () => {
  return await cache.isHealthy()
})

export async function GET() {
  try {
    await ensureDatabaseReady();
    const db = await getDbExecutor();
    const row = await db.get<{ ok: number }>("SELECT 1 as ok");

    const health = await HealthChecker.runAllChecks()
    const cacheStats = await cache.getStats()

    return NextResponse.json({
      status: "ok",
      database: "connected",
      probe: row?.ok ?? 0,
      health: health,
      cache: cacheStats,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
