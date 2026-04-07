// Surge Pricing Engine for Saree Pro
// Calculates dynamic pricing based on demand, weather, time, and location

export interface SurgePricingConfig {
  baseDeliveryFee: number;
  maxMultiplier: number;
  demandThreshold: number;
  timeMultipliers: Record<string, number>;
  weatherMultipliers: Record<string, number>;
  locationMultipliers: Record<string, number>;
}

export interface SurgePricingFactors {
  orderCount: number; // Orders in last 15 minutes
  availableDrivers: number;
  timeOfDay: string;
  weather: string;
  locationId: string;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface SurgePricingResult {
  originalFee: number;
  surgeFee: number;
  finalFee: number;
  multiplier: number;
  reason: string;
  isActive: boolean;
  estimatedWaitTime: number;
}

// Default configuration
const defaultConfig: SurgePricingConfig = {
  baseDeliveryFee: 5.00,
  maxMultiplier: 3.0,
  demandThreshold: 10,
  timeMultipliers: {
    'morning': 1.0,    // 6 AM - 12 PM
    'afternoon': 1.2,  // 12 PM - 6 PM
    'evening': 1.5,     // 6 PM - 10 PM
    'night': 2.0,       // 10 PM - 6 AM
  },
  weatherMultipliers: {
    'clear': 1.0,
    'cloudy': 1.1,
    'rainy': 1.3,
    'stormy': 1.8,
    'snowy': 2.0,
  },
  locationMultipliers: {
    'downtown': 1.3,
    'suburban': 1.0,
    'rural': 1.2,
    'airport': 1.5,
    'stadium': 2.0, // During events
  },
};

export class SurgePricingEngine {
  private config: SurgePricingConfig;
  private orderHistory: Map<string, number[]> = new Map();
  private driverLocations: Map<string, number> = new Map();

  constructor(config: Partial<SurgePricingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Calculate surge pricing based on current factors
   */
  calculateSurgePricing(
    locationId: string,
    factors: Partial<SurgePricingFactors> = {}
  ): SurgePricingResult {
    const currentFactors = this.getCurrentFactors(locationId, factors);
    const multiplier = this.calculateMultiplier(currentFactors);
    const originalFee = this.config.baseDeliveryFee;
    const surgeFee = originalFee * (multiplier - 1);
    const finalFee = originalFee * multiplier;

    const isActive = multiplier > 1.2; // Active if 20% or more increase
    const reason = this.getSurgeReason(multiplier, currentFactors);
    const estimatedWaitTime = this.estimateWaitTime(currentFactors);

    return {
      originalFee,
      surgeFee,
      finalFee,
      multiplier,
      reason,
      isActive,
      estimatedWaitTime,
    };
  }

  /**
   * Get current factors for surge calculation
   */
  private getCurrentFactors(
    locationId: string,
    customFactors: Partial<SurgePricingFactors>
  ): SurgePricingFactors {
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = this.getTimeOfDay(hour);
    const weather = customFactors.weather || 'clear';
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isHoliday = this.isHoliday(now);

    const orderCount = customFactors.orderCount || this.getRecentOrderCount(locationId);
    const availableDrivers = customFactors.availableDrivers || this.getAvailableDrivers(locationId);

    return {
      orderCount,
      availableDrivers,
      timeOfDay,
      weather,
      locationId,
      isWeekend,
      isHoliday,
      ...customFactors,
    };
  }

  /**
   * Calculate the surge multiplier
   */
  private calculateMultiplier(factors: SurgePricingFactors): number {
    let multiplier = 1.0;

    // Demand-based multiplier
    const demandRatio = factors.orderCount / Math.max(factors.availableDrivers, 1);
    if (demandRatio > this.config.demandThreshold) {
      multiplier += Math.min(demandRatio / 10, 1.5);
    }

    // Time-based multiplier
    multiplier *= this.config.timeMultipliers[factors.timeOfDay] || 1.0;

    // Weather-based multiplier
    multiplier *= this.config.weatherMultipliers[factors.weather] || 1.0;

    // Location-based multiplier
    multiplier *= this.config.locationMultipliers[factors.locationId] || 1.0;

    // Weekend multiplier
    if (factors.isWeekend) {
      multiplier *= 1.1;
    }

    // Holiday multiplier
    if (factors.isHoliday) {
      multiplier *= 1.3;
    }

    // Cap at maximum multiplier
    return Math.min(multiplier, this.config.maxMultiplier);
  }

  /**
   * Get human-readable reason for surge pricing
   */
  private getSurgeReason(multiplier: number, factors: SurgePricingFactors): string {
    const reasons: string[] = [];

    if (factors.orderCount > this.config.demandThreshold) {
      reasons.push('High demand in your area');
    }

    if (factors.timeOfDay === 'evening' || factors.timeOfDay === 'night') {
      reasons.push('Peak hours');
    }

    if (factors.weather !== 'clear') {
      reasons.push(`${factors.weather} weather conditions`);
    }

    if (factors.isWeekend) {
      reasons.push('Weekend pricing');
    }

    if (factors.isHoliday) {
      reasons.push('Holiday pricing');
    }

    if (factors.locationId !== 'suburban') {
      reasons.push(`${factors.locationId} location`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Standard pricing';
  }

  /**
   * Estimate wait time based on current conditions
   */
  private estimateWaitTime(factors: SurgePricingFactors): number {
    let baseWaitTime = 15; // 15 minutes base

    // Adjust for demand
    const demandRatio = factors.orderCount / Math.max(factors.availableDrivers, 1);
    baseWaitTime += demandRatio * 5;

    // Adjust for weather
    const weatherDelay = {
      'clear': 0,
      'cloudy': 2,
      'rainy': 5,
      'stormy': 10,
      'snowy': 15,
    };
    baseWaitTime += weatherDelay[factors.weather as keyof typeof weatherDelay] || 0;

    // Adjust for time of day
    if (factors.timeOfDay === 'evening' || factors.timeOfDay === 'night') {
      baseWaitTime += 5;
    }

    return Math.min(baseWaitTime, 60); // Cap at 60 minutes
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Check if today is a holiday
   */
  private isHoliday(date: Date): boolean {
    // Simple holiday check - in production, use a proper holiday API
    const holidays = [
      '01-01', // New Year
      '12-25', // Christmas
      // Add more holidays as needed
    ];
    
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.includes(monthDay);
  }

  /**
   * Get recent order count for a location
   */
  private getRecentOrderCount(locationId: string): number {
    const orders = this.orderHistory.get(locationId) || [];
    const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
    
    // Filter orders from last 15 minutes
    const recentOrders = orders.filter(timestamp => timestamp > fifteenMinutesAgo);
    this.orderHistory.set(locationId, recentOrders);
    
    return recentOrders.length;
  }

  /**
   * Get available drivers count for a location
   */
  private getAvailableDrivers(locationId: string): number {
    return this.driverLocations.get(locationId) || 5; // Default to 5
  }

  /**
   * Record a new order for surge calculation
   */
  recordOrder(locationId: string): void {
    const orders = this.orderHistory.get(locationId) || [];
    orders.push(Date.now());
    this.orderHistory.set(locationId, orders);
  }

  /**
   * Update available drivers count
   */
  updateDriverCount(locationId: string, count: number): void {
    this.driverLocations.set(locationId, count);
  }

  /**
   * Get surge pricing prediction for future time
   */
  predictSurgePricing(
    locationId: string,
    futureTime: Date
  ): SurgePricingResult {
    const hour = futureTime.getHours();
    const timeOfDay = this.getTimeOfDay(hour);
    const isWeekend = futureTime.getDay() === 0 || futureTime.getDay() === 6;
    const isHoliday = this.isHoliday(futureTime);

    // Use average demand for prediction
    const avgOrderCount = 8;
    const avgDrivers = 5;

    return this.calculateSurgePricing(locationId, {
      orderCount: avgOrderCount,
      availableDrivers: avgDrivers,
      timeOfDay,
      weather: 'clear', // Assume clear weather for prediction
      locationId,
      isWeekend,
      isHoliday,
    });
  }
}

// Singleton instance
export const surgePricingEngine = new SurgePricingEngine();

// Utility functions
export function formatSurgePricing(result: SurgePricingResult): string {
  if (!result.isActive) {
    return `Standard delivery fee: $${result.finalFee.toFixed(2)}`;
  }

  return `Surge pricing active (${(result.multiplier * 100).toFixed(0)}%): $${result.finalFee.toFixed(2)} - ${result.reason}`;
}

export function getSurgeColor(multiplier: number): string {
  if (multiplier <= 1.2) return 'text-green-600';
  if (multiplier <= 1.5) return 'text-yellow-600';
  if (multiplier <= 2.0) return 'text-orange-600';
  return 'text-red-600';
}
