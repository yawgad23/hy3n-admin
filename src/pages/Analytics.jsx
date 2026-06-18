import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Car, Users, Star } from "lucide-react";

const COLORS = ["#F5A623","#22C55E","#EF4444","#8B5CF6","#3B82F6"];

export default function Analytics() {
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      firebaseClient.entities.Ride.list("-created_date", 500),
      firebaseClient.entities.DriverProfile.list("-created_date", 200),
    ]).then(([r, d]) => { setRides(r); setDrivers(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  const totalRevenue = rides.filter(r => r.status === "completed").reduce((s, r) => s + (r.fare || 0), 0);
  const avgFare = rides.length ? (totalRevenue / Math.max(rides.filter(r=>r.status==="completed").length, 1)).toFixed(2) : 0;
  const completionRate = rides.length ? ((rides.filter(r => r.status === "completed").length / rides.length) * 100).toFixed(1) : 0;
  const avgRating = rides.filter(r => r.rating).length ? (rides.filter(r=>r.rating).reduce((s,r)=>s+(r.rating||0),0) / rides.filter(r=>r.rating).length).toFixed(1) : "N/A";

  // Status distribution
  const statusData = ["completed","in_progress","requested","accepted","cancelled"].map(s => ({
    name: s, value: rides.filter(r => r.status === s).length
  })).filter(d => d.value > 0);

  // Vehicle type distribution
  const vehicleData = ["Sedan","SUV","Tricycle","Motorcycle","Minivan"].map(v => ({
    name: v, rides: rides.filter(r => r.vehicle_type === v).length
  })).filter(d => d.rides > 0);

  // Payment method distribution
  const paymentData = ["Cash","Mobile Money","Card"].map(p => ({
    name: p, value: rides.filter(r => r.payment_method === p).length
  })).filter(d => d.value > 0);

  // Driver status
  const driverStatusData = ["Active","Inactive","Suspended","Pending"].map(s => ({
    name: s, count: drivers.filter(d => d.status === s).length
  })).filter(d => d.count > 0);

  // Top drivers by rides
  const topDrivers = [...drivers].sort((a, b) => (b.total_rides || 0) - (a.total_rides || 0)).slice(0, 8).map(d => ({
    name: d.full_name?.split(" ")[0] || "?",
    rides: d.total_rides || 0,
    earnings: d.total_earnings || 0,
  }));

  const StatCard = ({ label, value, icon: IconComp, color, sub }) => (
    <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}><IconComp size={20} className="text-black" /></div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );

  const ChartCard = ({ title, children }) => (
    <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Platform performance overview</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`GHS ${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-hy3n-gold" sub="Completed rides" />
        <StatCard label="Avg Fare" value={`GHS ${avgFare}`} icon={Car} color="bg-hy3n-green" sub="Per completed ride" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon={TrendingUp} color="bg-purple-500" sub={`${rides.length} total rides`} />
        <StatCard label="Avg Rating" value={avgRating} icon={Star} color="bg-hy3n-red" sub="Across all rides" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Rides by Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rides by Vehicle Type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vehicleData}>
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
              <YAxis tick={{ fill: "#888", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="rides" fill="#F5A623" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Drivers by Rides">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDrivers} layout="vertical">
              <XAxis type="number" tick={{ fill: "#888", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 11 }} width={60} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="rides" fill="#22C55E" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Methods">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Driver status breakdown */}
      <ChartCard title="Driver Fleet Status">
        <div className="flex gap-4 flex-wrap">
          {driverStatusData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-sm text-muted-foreground">{d.name}</span>
              <span className="text-sm font-bold text-white">{d.count}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={100} className="mt-4">
          <BarChart data={driverStatusData}>
            <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
            <YAxis tick={{ fill: "#888", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff" }} />
            <Bar dataKey="count" radius={[4,4,0,0]}>
              {driverStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}