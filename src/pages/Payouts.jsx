import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Wallet, CheckCircle, Clock, TrendingUp, RefreshCw, Search, Zap } from "lucide-react";
import DriverPayoutDetail from "../components/DriverPayoutDetail";

export default function Payouts() {
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      firebaseClient.entities.DriverProfile.list("-created_date", 200),
      firebaseClient.entities.Ride.filter({ status: "completed" }, "-created_date", 1000),
      firebaseClient.entities.Payout.list("-created_date", 1000),
      firebaseClient.entities.Commission.list("-created_date", 500),
    ]).then(([d, r, p, c]) => {
      setDrivers(d);
      setRides(r);
      setPayouts(p);
      setCommissions(c);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  // Build per-driver summary
  const driverSummaries = drivers.map(driver => {
    const driverRides = rides.filter(r => r.driver_id === driver.id || r.driver_name === driver.full_name);
    const driverCommissions = commissions.filter(c => c.driver_id === driver.id || c.driver_name === driver.full_name);
    const driverPayouts = payouts.filter(p => p.driver_id === driver.id);

    const grossEarnings = driverRides.reduce((s, r) => s + (r.fare || 0), 0);
    const totalCommission = driverCommissions.reduce((s, c) => s + (c.amount || 0), 0);
    const netEarnings = grossEarnings - totalCommission;

    const paidOut = driverPayouts.filter(p => p.status === "Paid").reduce((s, p) => s + (p.net_amount || 0), 0);
    const pendingOut = driverPayouts.filter(p => p.status === "Pending").reduce((s, p) => s + (p.net_amount || 0), 0);
    const unpaidBalance = netEarnings - paidOut - pendingOut;

    return {
      driver,
      grossEarnings,
      totalCommission,
      netEarnings,
      paidOut,
      pendingOut,
      unpaidBalance,
      rideCount: driverRides.length,
      hasPending: pendingOut > 0,
    };
  }).filter(s => s.rideCount > 0 || s.paidOut > 0);

  const generatePayout = async (summary) => {
    if (summary.unpaidBalance <= 0) return;
    setGenerating(summary.driver.id);
    const now = new Date();
    const period = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    await firebaseClient.entities.Payout.create({
      driver_id: summary.driver.id,
      driver_name: summary.driver.full_name,
      driver_phone: summary.driver.phone,
      gross_earnings: parseFloat(summary.grossEarnings.toFixed(2)),
      commission_deducted: parseFloat(summary.totalCommission.toFixed(2)),
      net_amount: parseFloat(summary.unpaidBalance.toFixed(2)),
      period,
      ride_count: summary.rideCount,
      status: "Pending",
    });
    setGenerating(null);
    fetchAll();
  };

  const totalPendingAll = driverSummaries.reduce((s, d) => s + d.pendingOut, 0);
  const totalPaidAll = driverSummaries.reduce((s, d) => s + d.paidOut, 0);
  const totalUnpaidAll = driverSummaries.reduce((s, d) => s + Math.max(d.unpaidBalance, 0), 0);

  const filtered = driverSummaries.filter(s => {
    const matchSearch = !search || s.driver.full_name?.toLowerCase().includes(search.toLowerCase()) || s.driver.phone?.includes(search);
    const matchFilter = filter === "All"
      || (filter === "Pending" && s.hasPending)
      || (filter === "Unpaid" && s.unpaidBalance > 0.01)
      || (filter === "Settled" && s.unpaidBalance <= 0.01 && !s.hasPending);
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Driver Payouts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Earnings minus commissions — track and pay drivers</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 bg-hy3n-surface border border-hy3n-border hover:border-hy3n-gold/40 text-white px-4 py-2.5 rounded-xl text-sm transition-colors font-semibold">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-hy3n-gold/15"><TrendingUp size={18} className="text-hy3n-gold" /></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Unpaid Balance</p>
          </div>
          <p className="text-2xl font-bold text-white">GHS {totalUnpaidAll.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {driverSummaries.filter(d => d.unpaidBalance > 0.01).length} drivers</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-hy3n-gold/15"><Clock size={18} className="text-hy3n-gold" /></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Payouts</p>
          </div>
          <p className="text-2xl font-bold text-hy3n-gold">GHS {totalPendingAll.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{driverSummaries.filter(d => d.hasPending).length} drivers awaiting payment</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-hy3n-green/15"><CheckCircle size={18} className="text-hy3n-green" /></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid Out</p>
          </div>
          <p className="text-2xl font-bold text-hy3n-green">GHS {totalPaidAll.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search driver..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60" />
        </div>
        <div className="flex gap-2">
          {["All","Unpaid","Pending","Settled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filter === f ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Driver payout table */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wide border-b border-hy3n-border">
                <th className="text-left px-5 py-3">Driver</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Gross Earnings</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Commission</th>
                <th className="text-right px-5 py-3">Net Earnings</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Paid Out</th>
                <th className="text-right px-5 py-3">Balance</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No drivers found</td></tr>
              )}
              {filtered.map(({ driver, grossEarnings, totalCommission, netEarnings, paidOut, pendingOut, unpaidBalance, rideCount, hasPending }) => (
                <tr key={driver.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-hy3n-gold/10 border border-hy3n-gold/20 flex items-center justify-center text-hy3n-gold font-bold text-xs shrink-0">
                        {driver.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium leading-tight">{driver.full_name}</p>
                        <p className="text-muted-foreground text-xs">{rideCount} rides</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground hidden md:table-cell">GHS {grossEarnings.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-hy3n-red hidden md:table-cell">- GHS {totalCommission.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-white font-semibold">GHS {netEarnings.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-hy3n-green hidden lg:table-cell">GHS {paidOut.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    {unpaidBalance > 0.01 ? (
                      <span className="text-hy3n-gold font-bold">GHS {unpaidBalance.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Settled</span>
                    )}
                    {hasPending && <span className="ml-1 text-xs text-blue-400">(+ pending)</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {unpaidBalance > 0.01 && (
                        <button onClick={() => generatePayout({ driver, grossEarnings, totalCommission, netEarnings, unpaidBalance, rideCount })}
                          disabled={generating === driver.id}
                          className="flex items-center gap-1 text-xs bg-hy3n-gold/10 text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <Zap size={12} />
                          {generating === driver.id ? "..." : "Generate"}
                        </button>
                      )}
                      <button onClick={() => setSelected(driver)}
                        className="text-xs text-muted-foreground border border-hy3n-border hover:text-white hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-colors">
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DriverPayoutDetail
          driver={selected}
          onClose={() => setSelected(null)}
          onUpdated={fetchAll}
        />
      )}
    </div>
  );
}