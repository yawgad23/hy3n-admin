const TRACKABLE_RIDE_STATUSES = new Set([
  "matched",
  "driver_arriving",
  "driver_arrived",
  "in_progress",
]);

export function isValidLatLng(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Number.isFinite(value.lat)
    && Number.isFinite(value.lng)
    && value.lat >= -90
    && value.lat <= 90
    && value.lng >= -180
    && value.lng <= 180;
}

/**
 * Defense in depth for the Admin-only map. The server already rejects stale
 * presence records; the browser only accepts that whitelisted response shape
 * and never reads profiles, Firestore, or a Driver device directly.
 */
export function renderableDriverLocation(ride) {
  if (!ride || !TRACKABLE_RIDE_STATUSES.has(String(ride.status || "").trim().toLowerCase())) return null;
  const location = ride.driver_location;
  if (!location || location.is_fresh !== true) return null;

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const updatedAt = String(location.updated_at || "");
  if (!isValidLatLng({ lat, lng }) || !Number.isFinite(Date.parse(updatedAt))) return null;

  return { lat, lng, updatedAt };
}

export function liveRideMapEntries(rides = []) {
  return rides.map((ride) => ({
    ride,
    pickup: isValidLatLng(ride?.pickup) ? ride.pickup : null,
    dropoff: isValidLatLng(ride?.destination) ? ride.destination : null,
    driver: renderableDriverLocation(ride),
  })).filter(({ pickup, dropoff, driver }) => pickup || dropoff || driver);
}
