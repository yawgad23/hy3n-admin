import { describe, expect, it } from "vitest";
import { isValidLatLng, liveRideMapEntries, renderableDriverLocation } from "../src/lib/liveDriverLocation";

const freshDriverLocation = {
  latitude: 5.6037,
  longitude: -0.187,
  updated_at: "2026-10-19T18:00:00.000Z",
  is_fresh: true,
};

function ride(overrides = {}) {
  return {
    id: "ride-1",
    status: "in_progress",
    pickup: { lat: 5.6, lng: -0.18 },
    destination: { lat: 5.61, lng: -0.17 },
    driver_location: freshDriverLocation,
    ...overrides,
  };
}

describe("Admin live Driver map guard", () => {
  it("accepts only the backend-approved fresh Driver projection for assigned active rides", () => {
    expect(renderableDriverLocation(ride())).toEqual({
      lat: 5.6037,
      lng: -0.187,
      updatedAt: "2026-10-19T18:00:00.000Z",
    });
    expect(renderableDriverLocation(ride({ status: "driver_queued" }))).toEqual({
      lat: 5.6037,
      lng: -0.187,
      updatedAt: "2026-10-19T18:00:00.000Z",
    });
  });

  it("does not render a Driver marker for searching, terminal, stale, malformed, or unapproved points", () => {
    expect(renderableDriverLocation(ride({ status: "searching" }))).toBeNull();
    expect(renderableDriverLocation(ride({ status: "completed" }))).toBeNull();
    expect(renderableDriverLocation(ride({ driver_location: { ...freshDriverLocation, is_fresh: false } }))).toBeNull();
    expect(renderableDriverLocation(ride({ driver_location: { ...freshDriverLocation, latitude: 91 } }))).toBeNull();
    expect(renderableDriverLocation(ride({ driver_location: { ...freshDriverLocation, updated_at: "invalid" } }))).toBeNull();
  });

  it("filters malformed pickup and destination values before they can reach Leaflet layers or bounds", () => {
    expect(isValidLatLng({ lat: 5.6, lng: -0.18 })).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: -0.18 })).toBe(false);
    expect(isValidLatLng({ lat: 5.6, lng: Number.NaN })).toBe(false);

    const [entry] = liveRideMapEntries([ride({
      pickup: { lat: 91, lng: -0.18 },
      destination: { lat: 5.61, lng: Number.NaN },
    })]);
    expect(entry.pickup).toBeNull();
    expect(entry.dropoff).toBeNull();
    expect(entry.driver).toEqual({ lat: 5.6037, lng: -0.187, updatedAt: "2026-10-19T18:00:00.000Z" });
  });
});
