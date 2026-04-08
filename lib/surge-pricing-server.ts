import { getDbExecutor } from "@/lib/db";
import { SurgePricingEngine, type SurgePricingResult } from "@/lib/surge-pricing";

export interface LiveSurgePricingSnapshot {
  pricing: SurgePricingResult;
  factors: {
    locationId: string;
    normalizedLocationId: string;
    orderCount: number;
    availableDrivers: number;
    weather: string;
  };
  refreshedAt: string;
}

function normalizeLocationCategory(locationId: string) {
  const value = locationId.toLowerCase();

  if (value.includes("airport")) return "airport";
  if (value.includes("stadium")) return "stadium";
  if (value.includes("downtown") || value.includes("center") || value.includes("olaya")) {
    return "downtown";
  }
  if (value.includes("rural")) return "rural";
  return "suburban";
}

export async function getLiveSurgePricing(options: {
  locationId: string;
  merchantId?: string;
  baseDeliveryFee?: number;
  weather?: string;
}): Promise<LiveSurgePricingSnapshot> {
  const db = await getDbExecutor();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const orderCountRow = options.merchantId
    ? await db.get<{ count: number }>(
        `SELECT CAST(COUNT(*) AS INTEGER) as count
         FROM orders
         WHERE merchant_id = ?
           AND created_at >= ?
           AND status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')`,
        [options.merchantId, since],
      )
    : await db.get<{ count: number }>(
        `SELECT CAST(COUNT(*) AS INTEGER) as count
         FROM orders
         WHERE created_at >= ?
           AND status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')`,
        [since],
      );

  const availableDriversRow = await db.get<{ count: number }>(
    `SELECT CAST(COUNT(*) AS INTEGER) as count
     FROM driver_profiles
     WHERE availability = 'available'`,
  );

  const normalizedLocationId = normalizeLocationCategory(options.locationId);
  const engine = new SurgePricingEngine({
    baseDeliveryFee: options.baseDeliveryFee ?? 5,
  });
  const pricing = engine.calculateSurgePricing(normalizedLocationId, {
    orderCount: orderCountRow?.count ?? 0,
    availableDrivers: availableDriversRow?.count ?? 0,
    weather: options.weather ?? "clear",
    locationId: normalizedLocationId,
  });

  return {
    pricing,
    factors: {
      locationId: options.locationId,
      normalizedLocationId,
      orderCount: orderCountRow?.count ?? 0,
      availableDrivers: availableDriversRow?.count ?? 0,
      weather: options.weather ?? "clear",
    },
    refreshedAt: new Date().toISOString(),
  };
}
