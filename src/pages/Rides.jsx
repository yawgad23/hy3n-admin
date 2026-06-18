import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Search, Plus, Car } from "lucide-react";
import RideForm from "../components/RideForm";

const statusColors = {
  "completed": "text-hy3n-green bg-hy3n-green/10",
  "in_progress": "text-hy3n-gold bg-hy3n-gold/10",
  "cancelled": "text-hy3n-red bg-hy3n-red/10",
  "requested": "text-blue-400 bg-blue-400/10",
  "matched": "text-purple-400 bg-purple-400/10",
};

export default function Rides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editRide, setEditRide] = useState(null);

  const fetchRides = () => {
    setLoading(true);
    firebaseClient.entities.Ride.list("-created_date", 200).then(data => {
      setRides(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchRides(); }, []);

  const filtered = rides.filter(r => {
    const matchSearch = !search || 
      r.rider_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.pickup_address || r.pickup_location || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this ride?")) return;
    await firebaseClient.entities.Ride.delete(id);
    fetchRides();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Rides</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{rides.length} total rides</p>
        </div>
        <button
          onClick={() => { setEditRide(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Add Ride
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by rider, driver, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "requested", "matched", "in_progress", "completed", "cancelled"].map(s => (
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

      {/* Table */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wide border-b border-hy3n-border bg-white/2">
                  <th className="text-left px-5 py-3">Rider</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Driver</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Pickup</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Dropoff</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Payment</th>
                  <th className="text-right px-5 py-3">Fare</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ride => (
                  <tr key={ride.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{ride.rider_name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{ride.driver_name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      <span className="block truncate max-w-[140px]">{ride.pickup_address || ride.pickup_location || "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      <span className="block truncate max-w-[140px]">{ride.destination_address || ride.dropoff_location || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[ride.status] || "text-white bg-white/10"}`}>
                        {ride.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden sm:table-cell">{ride.payment_method || "—"}</td>
                    <td className="px-5 py-3 text-right text-white font-semibold">{(ride.fare_estimate || ride.fare) ? `GHS ${ride.fare_estimate || ride.fare}` : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditRide(ride); setShowForm(true); }} className="text-xs text-hy3n-gold hover:underline">Edit</button>
                        <button onClick={() => handleDelete(ride.id)} className="text-xs text-hy3n-red hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-14 text-muted-foreground">No rides found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <RideForm
          ride={editRide}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRides(); }}
        />
      )}
    </div>
  );
}