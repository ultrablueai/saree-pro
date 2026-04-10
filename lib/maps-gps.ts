/**
 * Maps & GPS Integration
 * 
 * Features:
 * - Address geocoding
 * - Distance calculation
 * - Delivery time estimation
 * - Route optimization (placeholder)
 */

import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  street: string;
  building: string;
  district?: string;
  city: string;
  coordinates?: Coordinates;
}

export interface DeliveryEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  estimatedFee: number;
}

export interface NearbyDriver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  availability: 'offline' | 'online' | 'busy';
  current_latitude: number;
  current_longitude: number;
  distance: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate delivery time and fee based on distance
 */
export function estimateDelivery(
  merchantCoords: Coordinates,
  customerCoords: Coordinates,
  baseFee: number = 1200, // Base fee in cents (12.00 SAR)
  feePerKm: number = 200, // Fee per km in cents (2.00 SAR)
  speedKmh: number = 30 // Average speed in city
): DeliveryEstimate {
  const distanceKm = calculateDistance(merchantCoords, customerCoords);
  
  // Estimate time: distance / speed + 10 minutes for preparation
  const travelMinutes = (distanceKm / speedKmh) * 60;
  const estimatedMinutes = Math.round(travelMinutes + 10);
  
  // Calculate fee: base + (distance * per_km)
  const estimatedFee = Math.round(baseFee + (distanceKm * feePerKm));
  
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    estimatedMinutes,
    estimatedFee,
  };
}

/**
 * Geocode an address (placeholder - integrate with Google Maps API)
 */
export async function geocodeAddress(
  street: string,
  city: string,
  district?: string
): Promise<Coordinates | null> {
  // TODO: Integrate with Google Maps Geocoding API
  // For now, return mock coordinates
  void street;
  void district;

  // Mock implementation - replace with actual API call
  const mockCoordinates: Record<string, Coordinates> = {
    'riyadh': { latitude: 24.7136, longitude: 46.6753 },
    'jeddah': { latitude: 21.4858, longitude: 39.1925 },
    'dammam': { latitude: 26.3927, longitude: 49.9720 },
  };
  
  const cityKey = city.toLowerCase();
  return mockCoordinates[cityKey] || null;
}

/**
 * Reverse geocode coordinates to address (placeholder)
 */
export async function reverseGeocode(
  coordinates: Coordinates
): Promise<string | null> {
  // TODO: Integrate with Google Maps Reverse Geocoding API
  void coordinates;
  return null;
}

/**
 * Get optimized route (placeholder)
 */
export interface RouteOptimization {
  waypoints: Coordinates[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
}

export async function getOptimizedRoute(
  origin: Coordinates,
  destinations: Coordinates[]
): Promise<RouteOptimization | null> {
  // TODO: Integrate with Google Maps Directions API
  // For now, return simple calculation
  
  let totalDistance = 0;
  let currentLocation = origin;
  
  for (const dest of destinations) {
    totalDistance += calculateDistance(currentLocation, dest);
    currentLocation = dest;
  }
  
  return {
    waypoints: [origin, ...destinations],
    totalDistanceKm: Math.round(totalDistance * 100) / 100,
    totalDurationMinutes: Math.round((totalDistance / 30) * 60),
  };
}

/**
 * Update delivery fee based on distance
 */
export async function updateDeliveryFee(
  orderId: string,
  merchantCoords: Coordinates,
  customerCoords: Coordinates
): Promise<{ success: boolean; fee?: number; error?: string }> {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify order ownership
  const order = await db.get(
    `SELECT * FROM orders WHERE id = ? AND (customer_id = ? OR merchant_id IN (
      SELECT id FROM merchants WHERE owner_user_id = ?
    ))`,
    [orderId, session.id, session.id]
  );

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  // Calculate estimated delivery
  const estimate = estimateDelivery(merchantCoords, customerCoords);

  // Update delivery fee
  await db.run(
    `UPDATE orders SET delivery_fee_amount = ?, updated_at = datetime('now') WHERE id = ?`,
    [estimate.estimatedFee, orderId]
  );

  return { success: true, fee: estimate.estimatedFee };
}

/**
 * Get nearby drivers (for future dispatch system)
 */
export async function getNearbyDrivers(
  location: Coordinates,
  radiusKm: number = 5,
  maxDrivers: number = 10
): Promise<NearbyDriver[]> {
  const db = await getDbExecutor();

  // Get all online drivers
  const drivers = await db.all(
    `SELECT dp.*, u.full_name, u.phone
     FROM driver_profiles dp
     JOIN app_users u ON dp.user_id = u.id
     WHERE dp.availability = 'online'
     AND dp.current_latitude IS NOT NULL
     AND dp.current_longitude IS NOT NULL`
  ) as Array<Omit<NearbyDriver, 'distance'>>;

  // Filter by distance and sort
  const driversWithDistance = drivers
    .map(driver => {
      const driverCoords = {
        latitude: Number(driver.current_latitude),
        longitude: Number(driver.current_longitude),
      };
      const distance = calculateDistance(location, driverCoords);
      return { ...driver, distance };
    })
    .filter(driver => driver.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxDrivers);

  return driversWithDistance;
}
