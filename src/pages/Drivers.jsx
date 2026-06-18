import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Search, Plus, Star, Circle, Phone } from "lucide-react";
import DriverForm from "../components/DriverForm";

const statusColors = {
  "Active": "text-hy3n-green bg-hy3n-green/10",
  "Inactive": "text-muted-foreground bg-white/5",
  "Suspended": "text-hy3n-red bg-hy3n-red/10",
  "Pending": "text-hy3n-gold bg-hy3n-gold/10",
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState(null);

  const fetchDrivers = () => {
    setLoading(true);
    firebaseClient.entities.DriverProfile.list("-created_date", 200).then(data => {
      setDrivers(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchDrivers(); }, []);

  const filtered = drivers.filter(d => {
    const matchSearch = !search ||
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle_plate?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSuspend = async (driver) => {
    const newStatus = driver.status === "Suspended" ? "Active" : "Suspended";
    await firebaseClient.entities.DriverProfile.update(driver.id, { status: newStatus });
    fetchDrivers();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this driver?")) return;
    await firebaseClient.entities.DriverProfile.delete(id);
    fetchDrivers();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{drivers.length} registered drivers</p>
        </div>
        <button
          onClick={() => { setEditDriver(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, plate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Active", "Inactive", "Suspended", "Pending"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filterStatus === s ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <div key={driver.id} className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 hover:border-hy3n-gold/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-hy3n-gold/15 border border-hy3n-gold/30 flex items-center justify-center text-hy3n-gold font-bold text-sm">
                    {driver.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{driver.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-muted-foreground text-xs">{driver.phone}</p>
                      {driver.service_type && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-hy3n-gold/10 text-hy3n-gold border border-hy3n-gold/20 uppercase font-bold">
                          {driver.service_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle size={7} className={driver.is_online ? "fill-hy3n-green text-hy3n-green" : "fill-muted-foreground text-muted-foreground"} />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[driver.status] || "text-white bg-white/10"}`}>
                    {driver.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="text-white font-medium mt-0.5">{driver.vehicle_model || "—"}</p>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Plate</p>
                  <p className="text-white font-medium mt-0.5">{driver.vehicle_plate || "—"}</p>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Rides</p>
                  <p className="text-white font-medium mt-0.5">{driver.total_rides || 0}</p>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Earnings</p>
                  <p className="text-white font-medium mt-0.5">GHS {(driver.total_earnings || 0).toLocaleString()}</p>
                </div>
              </div>
              {driver.rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={12} className={n <= Math.round(driver.rating) ? "fill-hy3n-gold text-hy3n-gold" : "text-muted-foreground"} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{driver.rating?.toFixed(1)}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setEditDriver(driver); setShowForm(true); }} className="flex-1 text-xs text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/10 py-1.5 rounded-lg transition-colors">Edit</button>
                <button onClick={() => handleSuspend(driver)} className={`flex-1 text-xs py-1.5 rounded-lg transition-colors border ${
                  driver.status === "Suspended"
                    ? "text-hy3n-green border-hy3n-green/30 hover:bg-hy3n-green/10"
                    : "text-hy3n-red border-hy3n-red/30 hover:bg-hy3n-red/10"
                }`}>{driver.status === "Suspended" ? "Unsuspend" : "Suspend"}</button>
                <button onClick={() => handleDelete(driver.id)} className="text-xs text-muted-foreground border border-hy3n-border hover:text-hy3n-red py-1.5 px-2 rounded-lg transition-colors">✕</button>
                {driver.phone && (
                  <a 
                    href={`tel:${driver.phone}`} 
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-hy3n-green/10 text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/20 transition-colors"
                    title="Call Driver"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-14 text-muted-foreground">No drivers found</div>
          )}
        </div>
      )}

      {showForm && (
        <DriverForm
          driver={editDriver}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchDrivers(); }}
        />
      )}
    </div>
  );
}