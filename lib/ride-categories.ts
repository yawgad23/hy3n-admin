export interface RideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  base_fare: number; // GH₵
  per_km_rate: number; // GH₵ per km
  per_minute_rate: number; // GH₵ per minute
  min_fare: number; // GH₵
  max_passengers: number;
  vehicle_type: string;
  color: string;
  surge_multiplier?: number; // 1.0 = no surge, 1.5 = 50% surge
}

export const RIDE_CATEGORIES: Record<string, RideCategory> = {
  economy: {
    id: 'economy',
    name: 'Economy',
    description: 'Affordable rides in standard vehicles',
    icon: 'car',
    base_fare: 2.5,
    per_km_rate: 0.85,
    per_minute_rate: 0.15,
    min_fare: 5.0,
    max_passengers: 4,
    vehicle_type: 'Sedan',
    color: '#0a7ea4',
    surge_multiplier: 1.0,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Comfortable rides in premium vehicles',
    icon: 'car-side',
    base_fare: 5.0,
    per_km_rate: 1.5,
    per_minute_rate: 0.25,
    min_fare: 10.0,
    max_passengers: 4,
    vehicle_type: 'SUV/Premium',
    color: '#D4AF37',
    surge_multiplier: 1.0,
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    description: 'Fast delivery for packages and food',
    icon: 'package',
    base_fare: 1.5,
    per_km_rate: 0.5,
    per_minute_rate: 0.1,
    min_fare: 3.0,
    max_passengers: 1,
    vehicle_type: 'Bike/Car',
    color: '#22C55E',
    surge_multiplier: 1.0,
  },
};

/**
 * Calculate fare for a ride
 */
export function calculateFare(
  category: RideCategory,
  distanceKm: number,
  durationMinutes: number,
  surgeMultiplier: number = 1.0
): number {
  const distanceFare = distanceKm * category.per_km_rate;
  const timeFare = durationMinutes * category.per_minute_rate;
  const subtotal = category.base_fare + distanceFare + timeFare;
  const withSurge = subtotal * surgeMultiplier;
  return Math.max(withSurge, category.min_fare);
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): RideCategory | null {
  return RIDE_CATEGORIES[id] || null;
}

/**
 * Get all available categories
 */
export function getAllCategories(): RideCategory[] {
  return Object.values(RIDE_CATEGORIES);
}

/**
 * Format fare as currency
 */
export function formatFare(amount: number): string {
  return `GH₵${amount.toFixed(2)}`;
}

/**
 * Get category color
 */
export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.color || '#0a7ea4';
}

/**
 * Get category icon
 */
export function getCategoryIcon(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.icon || 'car';
}
