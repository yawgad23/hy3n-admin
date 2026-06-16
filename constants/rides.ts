/**
 * Ride category definitions and fare calculation constants
 * Exact match from HY3N web app
 */

export interface RideCategory {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMin: number;
  waitingFeePerMin: number;
  minFare: number;
  seats: number;
  icon: string;
}

export const RIDE_CATEGORIES: Record<string, RideCategory> = {
  standard: {
    id: "standard",
    name: "Standard",
    description: "Affordable everyday rides",
    basePrice: 11.00,
    pricePerKm: 4.18,
    pricePerMin: 0.44,
    waitingFeePerMin: 0.55,
    minFare: 16.50,
    seats: 4,
    icon: "car"
  },
  comfort: {
    id: "comfort",
    name: "Comfort",
    description: "Comfortable rides with extra amenities",
    basePrice: 16.50,
    pricePerKm: 5.06,
    pricePerMin: 0.66,
    waitingFeePerMin: 0.88,
    minFare: 27.50,
    seats: 4,
    icon: "star"
  },
  kantanka: {
    id: "kantanka",
    name: "Kantanka",
    description: "Proudly Ghanaian-made mini SUVs",
    basePrice: 13.20,
    pricePerKm: 4.62,
    pricePerMin: 0.55,
    waitingFeePerMin: 0.66,
    minFare: 22.00,
    seats: 4,
    icon: "car"
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Luxury travel for special occasions",
    basePrice: 27.50,
    pricePerKm: 6.60,
    pricePerMin: 1.10,
    waitingFeePerMin: 1.65,
    minFare: 44.00,
    seats: 4,
    icon: "shield-check"
  },
  okada: {
    id: "okada",
    name: "Okada",
    description: "Fast bike rides to beat traffic",
    basePrice: 5.50,
    pricePerKm: 1.65,
    pricePerMin: 0.33,
    waitingFeePerMin: 0.33,
    minFare: 8.80,
    seats: 1,
    icon: "bike"
  },
  express_delivery: {
    id: "express_delivery",
    name: "Express Delivery",
    description: "Fast package delivery across the city",
    basePrice: 16.50,
    pricePerKm: 2.20,
    pricePerMin: 0.55,
    waitingFeePerMin: 0.55,
    minFare: 22.00,
    seats: 0,
    icon: "package"
  }
};

export const FREE_WAITING_MINUTES = 3;

/**
 * Calculate fare for a ride
 */
export function calculateFare(
  categoryId: string,
  distanceKm: number,
  durationMinutes: number
): number {
  const category = RIDE_CATEGORIES[categoryId];
  if (!category) {
    throw new Error(`Unknown ride category: ${categoryId}`);
  }

  const distanceFare = distanceKm * category.pricePerKm;
  const timeFare = durationMinutes * category.pricePerMin;
  const subtotal = category.basePrice + distanceFare + timeFare;
  const total = Math.max(subtotal, category.minFare);

  return Math.round(total * 100) / 100;
}

/**
 * Get fare breakdown for a ride
 */
export function getFareBreakdown(
  categoryId: string,
  distanceKm: number,
  durationMinutes: number
) {
  const category = RIDE_CATEGORIES[categoryId];
  if (!category) {
    throw new Error(`Unknown ride category: ${categoryId}`);
  }

  const baseFare = category.basePrice;
  const distanceFare = distanceKm * category.pricePerKm;
  const timeFare = durationMinutes * category.pricePerMin;
  const subtotal = baseFare + distanceFare + timeFare;
  const total = Math.max(subtotal, category.minFare);

  return {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceFare: Math.round(distanceFare * 100) / 100,
    timeFare: Math.round(timeFare * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
