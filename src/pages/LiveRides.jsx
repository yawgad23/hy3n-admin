import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { MapPin, Navigation, Clock, RefreshCw, Circle, AlertTriangle } from "lucide-react";
import DispatchEngine from "../components/DispatchEngine";
import LiveMap from "../components/LiveMap";

const tripStatusConfig = {
  "requested":   { label: "Waiting for Driver", color: "text-blue-400 bg-blue-400/10", dot: "bg-blue-400", pulse: false },
  "matched":    { label: "Driver Assigned", color: "text-purple-400 bg-purple-400/10", dot: "bg-purple-400", pulse: true },
  "in_progress": { label: "Trip Started ✓", color: "text-hy3n-green bg-hy3n-green/10", dot: "bg-hy3n-green", pulse: true },
  "completed":   { label: "Completed", color: "text-muted-foreground bg-white/5", dot: "bg-muted-foreground", pulse: false },
  "cancelled":   { label: "Cancelled", color: "text-hy3n-red bg-hy3n-red/10", dot: "bg-hy3n-red", pulse: false },
};

export default function LiveRides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dispatchRide, setDispatchRide] = useState(null);

  const fetchRides = () => {
    setLoading(true);
    firebaseClient.entities.Ride.list("-updated_date", 200).then(data => {
      setRides(data);
      setLoading(false);
      setLastRefresh(new Date());
    });
  };

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 30000);
    return () => clearInterval(interval);
  }, []);

  const active = rides.filter(r => ["requested","matched","in_progress"].includes(r.status));
  const tripStarted = active.filter(r => r.status === "in_progress");
  const waiting = active.filter(r => r.status === "requested");
  const accepted = active.filter(r => r.status === "matched");

  const updateRideStatus = async (ride, status) => {
    await firebaseClient.entities.Ride.update(ride.id, { status });
    fetchRides();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Rides</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {active.length} active rides · refreshes every 30s · last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={fetchRides} disabled={loading}
          className="flex items-center gap-2 border border-hy3n-border text-muted-foreground hover:text-white hover:border-hy3n-gold/40 px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
          <p className="text-3xl font-bold text-blue-400">{waiting.length}</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-xs text-muted-foreground">Accepted</p>
          </div>
          <p className="text-3xl font-bold text-purple-400">{accepted.length}</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-hy3n-green animate-pulse" />
            <p className="text-xs text-muted-foreground">Trip Started</p>
          </div>
          <p className="text-3xl font-bold text-hy3n-green">{tripStarted.length}</p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden" style={{ height: 420 }}>
        <div className="px-5 py-3 border-b border-hy3n-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Live Map</h2>
          <span className="text-xs text-muted-foreground">{active.length} active rides shown</span>
        </div>
        <div style={{ height: 374 }}>
          <LiveMap rides={active} />
        </div>
      </div>

      {/* Active ride cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Rides ({active.length})</h2>
        {loading && active.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
          </div>
        ) : active.length === 0 ? (
          <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl py-16 text-center text-muted-foreground">
            No active rides right now
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(ride => {
              const cfg = tripStatusConfig[ride.status];
              return (
                <div key={ride.id} className={`bg-hy3n-surface rounded-2xl p-5 border transition-colors ${
                  ride.status === "in_progress" ? "border-hy3n-green/40" :
                  ride.status === "matched" ? "border-purple-400/30" : "border-hy3n-border"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    {(ride.fare_estimate || ride.fare) && <span className="text-white font-bold text-sm">GHS {ride.fare_estimate || ride.fare}</span>}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin size={12} className="text-hy3n-green mt-0.5 flex-shrink-0" />
                      <span className="text-white truncate">{ride.pickup_address || ride.pickup_location || "—"}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Navigation size={12} className="text-hy3n-red mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{ride.destination_address || ride.dropoff_location || "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground">Rider</p>
                      <p className="text-white font-medium mt-0.5 truncate">{ride.rider_name || "—"}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground">Driver</p>
                      <p className="text-white font-medium mt-0.5 truncate">{ride.driver_name || "Not Assigned"}</p>
                    </div>
                    {ride.vehicle_type && (
                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="text-white font-medium mt-0.5">{ride.vehicle_type}</p>
                      </div>
                    )}
                    {ride.payment_method && (
                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground">Payment</p>
                        <p className="text-white font-medium mt-0.5">{ride.payment_method}</p>
                      </div>
                    )}
                  </div>

                  {/* Admin actions */}
                  <div className="flex gap-2 flex-wrap">
                    {ride.status === "requested" && (
                      <button onClick={() => setDispatchRide(ride)}
                        className="text-xs text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                        ⚡ Dispatch
                      </button>
                    )}
                    {ride.status !== "completed" && (
                      <button onClick={() => updateRideStatus(ride, "completed")}
                        className="text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-2 py-1 rounded-lg transition-colors">
                        Complete
                      </button>
                    )}
                    <button onClick={() => updateRideStatus(ride, "cancelled")}
                      className="text-xs text-hy3n-red border border-hy3n-red/30 hover:bg-hy3n-red/10 px-2 py-1 rounded-lg transition-colors ml-auto">
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent completed/cancelled */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Completed</h2>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wide border-b border-hy3n-border">
                  <th className="text-left px-5 py-3">Rider</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Driver</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Fare</th>
                </tr>
              </thead>
              <tbody>
                {rides.filter(r => ["completed","cancelled"].includes(r.status)).slice(0,10).map(ride => {
                  const cfg = tripStatusConfig[ride.status];
                  return (
                    <tr key={ride.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{ride.rider_name}</td>
                      <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{ride.driver_name || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{ride.status}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-white font-semibold">{(ride.fare_estimate || ride.fare) ? `GHS ${ride.fare_estimate || ride.fare}` : "—"}</td>
                    </tr>
                  );
                })}
                {rides.filter(r => ["completed","cancelled"].includes(r.status)).length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No completed rides yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {dispatchRide && (
        <DispatchEngine
          ride={dispatchRide}
          onClose={() => setDispatchRide(null)}
          onDispatched={fetchRides}
        />
      )}
    </div>
  );
}