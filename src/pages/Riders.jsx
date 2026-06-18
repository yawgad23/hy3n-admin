import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Search, Plus, Star, Phone } from "lucide-react";
import RiderForm from "../components/RiderForm";

const statusColors = {
  "Active": "text-hy3n-green bg-hy3n-green/10",
  "Inactive": "text-muted-foreground bg-white/5",
  "Suspended": "text-hy3n-red bg-hy3n-red/10",
};

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editRider, setEditRider] = useState(null);

  const fetchRiders = () => {
    setLoading(true);
    firebaseClient.entities.RiderProfile.list("-created_date", 200).then(data => {
      setRiders(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchRiders(); }, []);

  const filtered = riders.filter(r => {
    const matchSearch = !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.toLowerCase().includes(search.toLowerCase()) ||
      r.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this rider?")) return;
    await firebaseClient.entities.RiderProfile.delete(id);
    fetchRiders();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Riders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{riders.length} registered riders</p>
        </div>
        <button
          onClick={() => { setEditRider(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Add Rider
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          />
        </div>
        <div className="flex gap-2">
          {["All", "Active", "Inactive", "Suspended"].map(s => (
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
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Phone</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">City</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Rides</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Spent</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Rating</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rider => (
                  <tr key={rider.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                          {rider.full_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-white font-medium">{rider.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{rider.phone}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{rider.city || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[rider.status] || "text-white bg-white/10"}`}>
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white hidden sm:table-cell">{rider.total_rides || 0}</td>
                    <td className="px-5 py-3 text-white hidden md:table-cell">GHS {(rider.total_spent || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {rider.rating ? (
                        <div className="flex items-center gap-1">
                          <Star size={11} className="fill-hy3n-gold text-hy3n-gold" />
                          <span className="text-white text-xs">{rider.rating.toFixed(1)}</span>
                        </div>
                      ) : "—"}
                    </td>
	                    <td className="px-5 py-3 text-right">
	                      <div className="flex items-center justify-end gap-2">
	                        {rider.phone && (
	                          <a 
	                            href={`tel:${rider.phone}`} 
	                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-hy3n-green/10 text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/20 transition-colors mr-1"
	                            title="Call Rider"
	                          >
	                            <Phone size={12} />
	                          </a>
	                        )}
	                        <button onClick={() => { setEditRider(rider); setShowForm(true); }} className="text-xs text-hy3n-gold hover:underline">Edit</button>
	                        <button onClick={() => handleDelete(rider.id)} className="text-xs text-hy3n-red hover:underline">Delete</button>
	                      </div>
	                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-14 text-muted-foreground">No riders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <RiderForm
          rider={editRider}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRiders(); }}
        />
      )}
    </div>
  );
}