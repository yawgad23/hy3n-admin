import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Car, Users, UserCircle, TrendingUp, Star, Clock, CheckCircle, XCircle } from "lucide-react";

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-black" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  </div>
);

const statusColors = {
  "completed": "text-hy3n-green bg-hy3n-green/10",
  "in_progress": "text-hy3n-gold bg-hy3n-gold/10",
  "cancelled": "text-hy3n-red bg-hy3n-red/10",
  "requested": "text-blue-400 bg-blue-400/10",
  "matched": "text-purple-400 bg-purple-400/10",
};

export default function Dashboard() {
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      firebaseClient.entities.Ride.list("-created_date", 50),
      firebaseClient.entities.DriverProfile.list("-created_date", 200),
      firebaseClient.entities.RiderProfile.list("-created_date", 200),
    ]).then(([r, d, ri]) => {
      setRides(r);
      setDrivers(d);
      setRiders(ri);
      setLoading(false);
    });
  }, []);

  const totalRevenue = rides.filter(r => r.status === "completed").reduce((s, r) => s + (r.fare_estimate || r.fare || 0), 0);
  const activeDrivers = drivers.filter(d => d.is_online).length;
  const completedToday = rides.filter(r => r.status === "completed").length;
  const recentRides = rides.slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Akwaaba — here's what's happening with HY3N</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Rides" value={rides.length} icon={Car} color="bg-hy3n-gold" sub={`${completedToday} completed`} />
        <StatCard label="Total Revenue" value={`GHS ${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-hy3n-green" sub="All time earnings" />
        <StatCard label="Active Drivers" value={activeDrivers} icon={UserCircle} color="bg-hy3n-red" sub={`${drivers.length} total drivers`} />
        <StatCard label="Riders" value={riders.length} icon={Users} color="bg-purple-500" sub="Registered users" />
      </div>

      {/* Ride status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["requested","matched","in_progress","completed","cancelled"].map(status => {
          const count = rides.filter(r => r.status === status).length;
          return (
            <div key={status} className="bg-hy3n-surface border border-hy3n-border rounded-xl px-4 py-3 flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[status] || "text-white bg-white/10"}`}>{status}</span>
              <span className="text-white font-bold ml-auto">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Recent rides */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-hy3n-border flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Rides</h2>
          <a href="/rides" className="text-xs text-hy3n-gold hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wide border-b border-hy3n-border">
                <th className="text-left px-5 py-3">Rider</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Driver</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Route</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Fare</th>
              </tr>
            </thead>
            <tbody>
              {recentRides.map((ride, i) => (
                <tr key={ride.id} className="border-b border-hy3n-border/50 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{ride.rider_name || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{ride.driver_name || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                    <span className="block truncate max-w-[200px]">{ride.pickup_location} → {ride.dropoff_location}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[ride.status] || "text-white bg-white/10"}`}>
                      {ride.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-white font-medium">
                    {(ride.fare_estimate || ride.fare) ? `GHS ${ride.fare_estimate || ride.fare}` : "—"}
                  </td>
                </tr>
              ))}
              {recentRides.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No rides yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}