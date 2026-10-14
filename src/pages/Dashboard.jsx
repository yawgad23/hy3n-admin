import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { adminApi } from "@/api/adminApi";
import RideFinancialLedger from "@/components/RideFinancialLedger";
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
  "searching": "text-blue-400 bg-blue-400/10",
  "matched": "text-purple-400 bg-purple-400/10",
};

export default function Dashboard() {
  const [rides, setRides] = useState([]);
  const [accountSummary, setAccountSummary] = useState(null);
  const [rideFinancials, setRideFinancials] = useState({ summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      firebaseClient.entities.Ride.list("-created_date", 50),
      adminApi.rideFinancials(),
      adminApi.accountSummary(),
    ]).then(([r, financials, summary]) => {
      setRides(r);
      setRideFinancials(financials || { summary: {} });
      setAccountSummary(summary || null);
      setLoading(false);
    }).catch((err) => {
      console.error("[Dashboard] Error loading data:", err);
      setLoading(false);
    });
  }, []);

  const totalRideCharge = Number(rideFinancials.summary?.totalRideCharge || 0);
  const drivers = accountSummary?.drivers || { totalRegistered: 0, online: 0, byApproval: {}, byType: {} };
  const riders = accountSummary?.riders || { totalRegistered: 0, byStatus: {} };
  const driverTypes = Object.entries(drivers.byType || {}).sort(([first], [second]) => first.localeCompare(second));
  const completedToday = rides.filter(r => r.status === "completed").length;
  const recentRides = rides.slice(0, 8);
  const displayFare = (ride) => {
    const amount = ride.status === "completed"
      ? (ride.final_fare ?? ride.fare ?? ride.fare_estimate)
      : (ride.fare_estimate ?? ride.quoted_fare ?? ride.fare);
    const numeric = Number(amount);
    return Number.isFinite(numeric) ? numeric : null;
  };

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
        <StatCard label="Completed Ride Charges" value={`GHS ${totalRideCharge.toLocaleString()}`} icon={TrendingUp} color="bg-hy3n-green" sub="Server final fares; not payment collection" />
        <StatCard label="Registered Drivers" value={drivers.totalRegistered} icon={UserCircle} color="bg-hy3n-red" sub={`${drivers.online || 0} online • ${drivers.byApproval?.approved || 0} approved`} />
        <StatCard label="Registered Riders" value={riders.totalRegistered} icon={Users} color="bg-purple-500" sub={`${riders.byStatus?.active || 0} active accounts`} />
      </div>

      <section className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-5" aria-labelledby="account-summary-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="account-summary-title" className="font-semibold text-white">Registered accounts</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Live server totals — no manual head count required.</p>
          </div>
          <p className="text-xs text-muted-foreground">{accountSummary?.complete === false ? "More than 50,000 records — shown totals are capped" : "All current account records counted"}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Drivers</p><p className="mt-1 text-2xl font-bold text-white">{drivers.totalRegistered}</p><p className="mt-1 text-xs text-muted-foreground">{drivers.online || 0} online now</p></div>
          <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Driver approval</p><p className="mt-1 text-sm font-medium text-white">{drivers.byApproval?.approved || 0} approved</p><p className="mt-1 text-xs text-muted-foreground">{drivers.byApproval?.pending || 0} pending · {drivers.byApproval?.rejected || 0} rejected</p></div>
          <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Riders</p><p className="mt-1 text-2xl font-bold text-white">{riders.totalRegistered}</p><p className="mt-1 text-xs text-muted-foreground">{riders.byStatus?.active || 0} active · {riders.byStatus?.suspended || 0} suspended</p></div>
          <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Driver types</p><p className="mt-1 text-sm font-medium capitalize text-white">{driverTypes.length ? driverTypes.map(([type, count]) => `${type}: ${count}`).join(" · ") : "No Drivers registered"}</p><p className="mt-1 text-xs text-muted-foreground">Car, Okada, Delivery, and other registered types</p></div>
        </div>
      </section>

      <RideFinancialLedger compact />

      {/* Ride status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["searching","matched","in_progress","completed","cancelled"].map(status => {
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
                    {displayFare(ride) !== null ? `GHS ${displayFare(ride)}` : "—"}
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
