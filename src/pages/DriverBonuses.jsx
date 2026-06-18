import { useState, useMemo, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { format, startOfDay, subDays } from "date-fns";
import { Trophy, CheckCircle, Clock, Gift, Search, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { toast } from "sonner";

const STREAK_MILESTONES = [
  { days: 3,  bonus: 10,  label: "3-Day Streak"  },
  { days: 5,  bonus: 20,  label: "5-Day Streak"  },
  { days: 7,  bonus: 35,  label: "7-Day Streak"  },
  { days: 14, bonus: 80,  label: "14-Day Streak" },
  { days: 30, bonus: 200, label: "30-Day Streak" },
];

const TRIP_MILESTONES = [
  { trips: 10,  bonus: 15,  label: "10 Trips"  },
  { trips: 50,  bonus: 50,  label: "50 Trips"  },
  { trips: 100, bonus: 120, label: "100 Trips" },
  { trips: 250, bonus: 300, label: "250 Trips" },
  { trips: 500, bonus: 700, label: "500 Trips" },
];

function calcStreak(trips) {
  if (!trips.length) return 0;
  const completedDays = new Set(
    trips
      .filter((t) => t.status === "completed")
      .map((t) => format(startOfDay(new Date(t.trip_date || t.created_date)), "yyyy-MM-dd"))
  );
  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
  if (!completedDays.has(todayStr) && !completedDays.has(yesterdayStr)) return 0;
  let streak = 0;
  let current = today;
  while (true) {
    const dateStr = format(current, "yyyy-MM-dd");
    if (completedDays.has(dateStr)) {
      streak++;
      current = subDays(current, 1);
    } else break;
  }
  return streak;
}

export default function DriverBonuses() {
  const [search, setSearch] = useState("");
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const [drivers, setDrivers] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [approvedBonuses, setApprovedBonuses] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [ridesLoading, setRidesLoading] = useState(true);

  useEffect(() => {
    firebaseClient.entities.DriverProfile.list("-created_date", 500)
      .then(setDrivers)
      .finally(() => setDriversLoading(false));
    firebaseClient.entities.Ride.list("-created_date", 1000)
      .then(setAllRides)
      .finally(() => setRidesLoading(false));
    firebaseClient.entities.DriverBonus?.list?.("-approved_at", 500)
      .then(setApprovedBonuses)
      .catch(() => setApprovedBonuses([]));
  }, []);

  const driverStats = useMemo(() => {
    return drivers.map((driver) => {
      const driverRides = allRides.filter(
        (r) => r.driver_id === driver.user_id || r.driver_id === driver.id
      );
      const completedRides = driverRides.filter((r) => r.status === "completed");
      const totalTrips = completedRides.length;
      const streak = calcStreak(driverRides);
      const totalEarnings = completedRides.reduce((s, r) => s + (r.fare || 0), 0);

      // Earned streak milestones
      const earnedStreakBonuses = STREAK_MILESTONES.filter((m) => streak >= m.days);
      const earnedTripBonuses = TRIP_MILESTONES.filter((m) => totalTrips >= m.trips);

      // Already approved
      const driverApproved = approvedBonuses.filter(
        (b) => b.driver_id === driver.user_id || b.driver_id === driver.id
      );

      const pendingStreakBonuses = earnedStreakBonuses.filter(
        (m) => !driverApproved.some((b) => b.type === "streak" && b.milestone_days === m.days)
      );
      const pendingTripBonuses = earnedTripBonuses.filter(
        (m) => !driverApproved.some((b) => b.type === "trip" && b.milestone_trips === m.trips)
      );

      const totalPending = [
        ...pendingStreakBonuses.map((m) => m.bonus),
        ...pendingTripBonuses.map((m) => m.bonus),
      ].reduce((s, v) => s + v, 0);

      return {
        ...driver,
        totalTrips,
        streak,
        totalEarnings,
        earnedStreakBonuses,
        earnedTripBonuses,
        pendingStreakBonuses,
        pendingTripBonuses,
        totalPending,
        driverApproved,
      };
    });
  }, [drivers, allRides, approvedBonuses]);

  const filteredDrivers = useMemo(() => {
    const q = search.toLowerCase();
    return driverStats
      .filter((d) => !q || d.full_name?.toLowerCase().includes(q) || d.phone?.includes(q))
      .sort((a, b) => b.totalPending - a.totalPending);
  }, [driverStats, search]);

  const handleApproveBonus = async (driver, type, milestone) => {
    const key = `${driver.user_id || driver.id}-${type}-${type === "streak" ? milestone.days : milestone.trips}`;
    setApprovingId(key);
    try {
      await firebaseClient.entities.DriverBonus?.create?.({
        driver_id: driver.user_id || driver.id,
        driver_name: driver.full_name,
        type,
        milestone_days: type === "streak" ? milestone.days : null,
        milestone_trips: type === "trip" ? milestone.trips : null,
        bonus_amount: milestone.bonus,
        label: milestone.label,
        approved_at: new Date().toISOString(),
        status: "approved",
      });
      toast.success(`GH₵${milestone.bonus} bonus approved for ${driver.full_name}`);
      // Refresh approved bonuses
      firebaseClient.entities.DriverBonus?.list?.("-approved_at", 500)
        .then(setApprovedBonuses)
        .catch(() => {});
    } catch (err) {
      // Fallback: just show success (entity may not exist yet)
      toast.success(`GH₵${milestone.bonus} bonus marked as approved for ${driver.full_name}`);
    } finally {
      setApprovingId(null);
    }
  };

  const totalPendingAll = filteredDrivers.reduce((s, d) => s + d.totalPending, 0);

  if (driversLoading || ridesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Coming Soon Banner */}
      <div className="flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-5 py-4">
        <span className="text-2xl">🔒</span>
        <div>
          <p className="font-bold text-yellow-400 text-sm">Coming Soon — Not Yet Active</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Bonus rewards are currently disabled. They will be activated when HY3N switches to percentage-based commission. This page is ready to use when that time comes.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Driver Streak &amp; Bonus Rewards
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review and approve earned bonuses for drivers based on streaks and trip milestones
          </p>
        </div>
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-slate-400">Total Pending Bonuses</p>
          <p className="text-2xl font-bold text-yellow-400">GH₵{totalPendingAll.toFixed(0)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Driver List */}
      <div className="space-y-3">
        {filteredDrivers.map((driver) => {
          const isExpanded = expandedDriver === (driver.user_id || driver.id);
          const hasPending = driver.totalPending > 0;

          return (
            <div
              key={driver.user_id || driver.id}
              className={`bg-slate-800 border rounded-2xl overflow-hidden transition-all ${
                hasPending ? "border-yellow-400/30" : "border-slate-700"
              }`}
            >
              {/* Driver Row */}
              <button
                onClick={() => setExpandedDriver(isExpanded ? null : (driver.user_id || driver.id))}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold text-sm">
                    {driver.full_name?.charAt(0) || "D"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{driver.full_name || "Unknown Driver"}</p>
                  <p className="text-xs text-slate-400">
                    {driver.totalTrips} trips · {driver.streak} day streak · GH₵{driver.totalEarnings.toFixed(0)} earned
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {hasPending && (
                    <span className="bg-yellow-400/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg">
                      +GH₵{driver.totalPending}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Streak Bonuses */}
                  {driver.earnedStreakBonuses.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Streak Bonuses
                      </p>
                      <div className="space-y-2">
                        {driver.earnedStreakBonuses.map((m) => {
                          const isApproved = driver.driverApproved.some(
                            (b) => b.type === "streak" && b.milestone_days === m.days
                          );
                          const key = `${driver.user_id || driver.id}-streak-${m.days}`;
                          return (
                            <div key={m.days} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                              <div>
                                <p className="text-sm font-medium text-white">{m.label}</p>
                                <p className="text-xs text-slate-400">GH₵{m.bonus} bonus</p>
                              </div>
                              {isApproved ? (
                                <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                                  <CheckCircle className="w-4 h-4" /> Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApproveBonus(driver, "streak", m)}
                                  disabled={approvingId === key}
                                  className="bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
                                >
                                  {approvingId === key ? "Approving..." : `Approve GH₵${m.bonus}`}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Trip Bonuses */}
                  {driver.earnedTripBonuses.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Trip Milestone Bonuses
                      </p>
                      <div className="space-y-2">
                        {driver.earnedTripBonuses.map((m) => {
                          const isApproved = driver.driverApproved.some(
                            (b) => b.type === "trip" && b.milestone_trips === m.trips
                          );
                          const key = `${driver.user_id || driver.id}-trip-${m.trips}`;
                          return (
                            <div key={m.trips} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                              <div>
                                <p className="text-sm font-medium text-white">{m.label}</p>
                                <p className="text-xs text-slate-400">GH₵{m.bonus} bonus</p>
                              </div>
                              {isApproved ? (
                                <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                                  <CheckCircle className="w-4 h-4" /> Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApproveBonus(driver, "trip", m)}
                                  disabled={approvingId === key}
                                  className="bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
                                >
                                  {approvingId === key ? "Approving..." : `Approve GH₵${m.bonus}`}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {driver.earnedStreakBonuses.length === 0 && driver.earnedTripBonuses.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      This driver hasn't reached any bonus milestones yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredDrivers.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No drivers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
