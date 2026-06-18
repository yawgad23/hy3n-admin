import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X, MapPin, Navigation, Zap, Star, CheckCircle, AlertCircle, User, Car } from "lucide-react";

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GHANA_CITIES = {
  "accra": [5.6037, -0.187], "kumasi": [6.6885, -1.6244], "tema": [5.6698, -0.0166],
  "tamale": [9.4008, -0.8393], "cape coast": [5.1053, -1.2466], "takoradi": [4.8845, -1.7554],
  "koforidua": [6.0941, -0.2573], "ho": [6.6012, 0.4713], "sunyani": [7.3349, -2.3277],
  "wa": [10.0601, -2.5099], "bolgatanga": [10.7856, -0.8514], "techiman": [7.5833, -1.9167],
};

function approxCoords(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase();
  for (const [city, coords] of Object.entries(GHANA_CITIES)) {
    if (lower.includes(city)) return coords;
  }
  return null;
}

function scoreDriver(driver, ride, activeRideDriverIds) {
  if (activeRideDriverIds.has(driver.id)) return null;
  if (!driver.is_online || driver.status !== "Active") return null;

  let score = 0;
  const reasons = [];

  if (ride.vehicle_type && driver.vehicle_type === ride.vehicle_type) {
    score += 40;
    reasons.push("Vehicle match");
  }

  if (ride.city && driver.city && ride.city.toLowerCase() === driver.city.toLowerCase()) {
    score += 20;
    reasons.push("Same city");
  }

  let distanceKm = null;
  if (driver.current_latitude && driver.current_longitude) {
    const pickupCoords = approxCoords(ride.pickup_location) || approxCoords(ride.city);
    if (pickupCoords) {
      distanceKm = haversine(driver.current_latitude, driver.current_longitude, pickupCoords[0], pickupCoords[1]);
      score += Math.max(0, 30 - distanceKm * 2);
      reasons.push(`~${distanceKm.toFixed(1)} km away`);
    }
  } else {
    const driverCoords = approxCoords(driver.city);
    const pickupCoords = approxCoords(ride.pickup_location) || approxCoords(ride.city);
    if (driverCoords && pickupCoords) {
      distanceKm = haversine(driverCoords[0], driverCoords[1], pickupCoords[0], pickupCoords[1]);
      score += Math.max(0, 20 - distanceKm);
      reasons.push(`~${distanceKm.toFixed(0)} km (city est.)`);
    }
  }

  if (driver.rating >= 4.5) { score += 10; reasons.push("Top rated"); }
  else if (driver.rating >= 4.0) { score += 5; reasons.push("Highly rated"); }

  return { score, reasons, distanceKm };
}

export default function DispatchEngine({ ride, onClose, onDispatched }) {
  const [drivers, setDrivers] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    Promise.all([
      firebaseClient.entities.DriverProfile.filter({ status: "Active" }, "-rating", 200),
      firebaseClient.entities.Ride.filter({ status: "accepted" }, "-created_date", 100),
    ]).then(([d, r]) => {
      setDrivers(d);
      setActiveRides(r);
      setLoading(false);
    });
  }, []);

  const activeRideDriverIds = new Set(activeRides.map(r => r.driver_id).filter(Boolean));

  const ranked = drivers
    .map(driver => {
      const result = scoreDriver(driver, ride, activeRideDriverIds);
      return result ? { driver, ...result } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (ranked.length > 0 && !selected) setSelected(ranked[0].driver.id);
  }, [ranked.length]);

  const handleDispatch = async () => {
    const entry = ranked.find(r => r.driver.id === selected);
    if (!entry) return;
    setDispatching(true);
    await firebaseClient.entities.Ride.update(ride.id, {
      driver_id: entry.driver.id,
      driver_name: entry.driver.full_name,
      driver_phone: entry.driver.phone || "",
      driver_vehicle: entry.driver.vehicle_model || entry.driver.vehicle_type || "",
      driver_plate: entry.driver.vehicle_plate || "",
      status: "matched",
      vehicle_type: entry.driver.vehicle_type,
    });
    setDispatched(true);
    setDispatching(false);
    setTimeout(() => {
      onDispatched();
      onClose();
    }, 1800);
  };

  const selectedEntry = ranked.find(r => r.driver.id === selected);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border sticky top-0 bg-hy3n-surface z-10">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-hy3n-gold" />
            <h2 className="font-bold text-white">Dispatch Engine</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ride summary */}
          <div className="bg-white/5 border border-hy3n-border rounded-xl p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Ride Request</p>
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-hy3n-gold shrink-0" />
              <span className="text-white font-medium">{ride.rider_name}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-hy3n-green mt-0.5 shrink-0" />
              <span className="text-white">{ride.pickup_location || "—"}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Navigation size={14} className="text-hy3n-red mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{ride.dropoff_location || "—"}</span>
            </div>
            {ride.vehicle_type && (
              <div className="flex items-center gap-2 text-sm">
                <Car size={14} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{ride.vehicle_type} requested</span>
              </div>
            )}
          </div>

          {/* Driver list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
            </div>
          ) : ranked.length === 0 ? (
            <div className="text-center py-10 border border-hy3n-border rounded-xl space-y-2">
              <AlertCircle size={32} className="text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">No available drivers found</p>
              <p className="text-xs text-muted-foreground">Ensure drivers are set to Online and Active</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
                Available Drivers — {ranked.length} found
              </p>
              <div className="space-y-2">
                {ranked.slice(0, 6).map(({ driver, score, reasons }, i) => (
                  <button key={driver.id} onClick={() => setSelected(driver.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                      selected === driver.id
                        ? "border-hy3n-gold bg-hy3n-gold/10"
                        : "border-hy3n-border bg-white/3 hover:border-hy3n-gold/30"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-hy3n-gold/15 border border-hy3n-gold/30 flex items-center justify-center text-hy3n-gold font-bold text-sm shrink-0">
                          {driver.full_name?.charAt(0)}
                        </div>
                        {i === 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-hy3n-gold rounded-full flex items-center justify-center text-black text-[9px] font-black">1</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{driver.full_name}</p>
                          {i === 0 && <span className="text-xs text-hy3n-gold font-semibold">Best match</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{driver.vehicle_type}</span>
                          {driver.vehicle_plate && <span className="text-xs text-muted-foreground">· {driver.vehicle_plate}</span>}
                          {driver.rating > 0 && (
                            <span className="text-xs flex items-center gap-0.5 text-hy3n-gold">
                              <Star size={10} className="fill-hy3n-gold" />{driver.rating?.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reasons.map(r => (
                            <span key={r} className="text-xs bg-white/5 text-muted-foreground px-1.5 py-0.5 rounded">{r}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-white">{Math.round(score)}</div>
                        <div className="text-xs text-muted-foreground">score</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dispatch button */}
          {!dispatched ? (
            <button onClick={handleDispatch} disabled={!selected || dispatching || ranked.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40">
              <Zap size={16} />
              {dispatching ? "Dispatching…" : selectedEntry ? `Dispatch ${selectedEntry.driver.full_name}` : "Select a Driver"}
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 bg-hy3n-green/10 border border-hy3n-green/30 text-hy3n-green font-bold py-3 rounded-xl text-sm">
              <CheckCircle size={16} />
              Driver Dispatched — Ride Accepted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}