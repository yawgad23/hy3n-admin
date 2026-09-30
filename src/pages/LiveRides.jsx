import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Circle, Clock, MapPin, Navigation, RefreshCw } from "lucide-react";
import LiveMap from "../components/LiveMap";
import TripDetailsDialog from "../components/TripDetailsDialog";
import { adminApi } from "@/api/adminApi";

const tripStatusConfig = {
  searching: { label: "Waiting for Driver", color: "text-blue-400 bg-blue-400/10", dot: "bg-blue-400" },
  matched: { label: "Driver Assigned", color: "text-purple-400 bg-purple-400/10", dot: "bg-purple-400" },
  driver_arriving: { label: "Driver Arriving", color: "text-amber-300 bg-amber-300/10", dot: "bg-amber-300" },
  driver_arrived: { label: "Driver Arrived", color: "text-amber-300 bg-amber-300/10", dot: "bg-amber-300" },
  in_progress: { label: "Trip Started", color: "text-hy3n-green bg-hy3n-green/10", dot: "bg-hy3n-green" },
  completed: { label: "Completed", color: "text-muted-foreground bg-white/5", dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelled", color: "text-hy3n-red bg-hy3n-red/10", dot: "bg-hy3n-red" },
};

function DetailButton({ rideId, open }) {
  return <button onClick={() => open(rideId)} className="rounded-lg border border-hy3n-gold/40 px-3 py-2 text-xs font-semibold text-hy3n-gold transition-colors hover:bg-hy3n-gold hover:text-black">Trip details</button>;
}

export default function LiveRides() {
  const [rides, setRides] = useState({ active: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedRideId, setSelectedRideId] = useState(null);

  const fetchRides = async () => {
    setLoading(true); setError("");
    try { setRides(await adminApi.liveRides()); setLastRefresh(new Date()); }
    catch (err) { setError(err.message || "Live rides could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchRides(); const interval = setInterval(fetchRides, 30000); return () => clearInterval(interval); }, []);

  const active = rides.active || [];
  const recent = rides.recent || [];
  const stats = useMemo(() => ({
    waiting: active.filter((ride) => ride.status === "searching").length,
    assigned: active.filter((ride) => ["matched", "driver_arriving", "driver_arrived"].includes(ride.status)).length,
    started: active.filter((ride) => ride.status === "in_progress").length,
  }), [active]);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-white">Live Rides</h1><p className="mt-0.5 text-sm text-muted-foreground">Protected HY3N operations feed · select a trip to view the matched Rider and Driver contacts{lastRefresh ? ` · last ${lastRefresh.toLocaleTimeString()}` : ""}</p></div><button onClick={fetchRides} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-xl border border-hy3n-border px-4 py-2.5 text-sm text-white hover:bg-white/5 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button></div>
    {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"><AlertTriangle size={16} /> {error}</div>}
    <div className="grid grid-cols-3 gap-3">{[["Waiting", stats.waiting, "bg-blue-400", "text-blue-400"], ["Assigned", stats.assigned, "bg-purple-400", "text-purple-400"], ["Trip Started", stats.started, "bg-hy3n-green", "text-hy3n-green"]].map(([label, count, dot, text]) => <div key={label} className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-4 text-center"><div className="mb-1 flex items-center justify-center gap-2"><span className={`h-2 w-2 rounded-full ${dot}`} /><p className="text-xs text-muted-foreground">{label}</p></div><p className={`text-3xl font-bold ${text}`}>{count}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface"><header className="flex items-center justify-between border-b border-hy3n-border px-5 py-3"><h2 className="text-sm font-semibold text-white">Live Map</h2><span className="text-xs text-muted-foreground">{active.length} active rides shown · no browser map key required</span></header><div style={{ height: 374 }}><LiveMap rides={active} /></div></section>
    <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active rides ({active.length})</h2>{loading && !active.length ? <div className="flex h-48 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-hy3n-gold/30 border-t-hy3n-gold" /></div> : !active.length ? <div className="rounded-2xl border border-hy3n-border bg-hy3n-surface py-16 text-center text-sm text-muted-foreground">No active rides right now</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((ride) => { const config = tripStatusConfig[ride.status] || tripStatusConfig.searching; return <article key={ride.id} className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-5"><div className="mb-4 flex items-start justify-between gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}><Circle size={8} className={config.dot} fill="currentColor" />{config.label}</span>{ride.fare !== null && <span className="text-sm font-bold text-white">GH₵{ride.fare.toFixed(2)}</span>}</div><div className="space-y-3 text-xs"><div className="flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-hy3n-green" /><div><p className="text-muted-foreground">Pickup</p><p className="mt-0.5 text-white">{ride.pickup_address || "Location unavailable"}</p></div></div><div className="flex gap-2"><Navigation size={14} className="mt-0.5 shrink-0 text-hy3n-red" /><div><p className="text-muted-foreground">Destination</p><p className="mt-0.5 text-white">{ride.destination_address || "Location unavailable"}</p></div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 px-3 py-2"><p className="text-muted-foreground">Rider</p><p className="mt-0.5 truncate text-white">{ride.rider_name}</p></div><div className="rounded-lg bg-white/5 px-3 py-2"><p className="text-muted-foreground">Driver</p><p className="mt-0.5 truncate text-white">{ride.driver_name || "Not assigned"}</p></div></div><div className="mt-4"><DetailButton rideId={ride.id} open={setSelectedRideId} /></div></article>; })}</div>}</section>
    <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent completed or cancelled rides</h2><div className="overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-hy3n-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 text-left">Rider</th><th className="hidden px-5 py-3 text-left md:table-cell">Driver</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Fare</th><th className="px-5 py-3 text-right">Details</th></tr></thead><tbody>{recent.slice(0, 10).map((ride) => { const config = tripStatusConfig[ride.status] || tripStatusConfig.completed; return <tr key={ride.id} className="border-b border-hy3n-border/40 last:border-0"><td className="px-5 py-3 font-medium text-white">{ride.rider_name}</td><td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{ride.driver_name || "—"}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.color}`}>{config.label}</span></td><td className="px-5 py-3 text-right font-semibold text-white">{ride.fare !== null ? `GH₵${ride.fare.toFixed(2)}` : "—"}</td><td className="px-5 py-3 text-right"><DetailButton rideId={ride.id} open={setSelectedRideId} /></td></tr>; })}{!recent.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No completed or cancelled rides yet.</td></tr>}</tbody></table></div></div></section>
    {selectedRideId && <TripDetailsDialog rideId={selectedRideId} onClose={() => setSelectedRideId(null)} />}
  </div>;
}
