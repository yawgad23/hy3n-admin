import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Plus, CheckCircle, Clock, Phone, Copy } from "lucide-react";
import CommissionForm from "../components/CommissionForm";

const MOMO_NUMBER = import.meta.env.VITE_MOMO_NUMBER || "0546728330";

export default function Commissions() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchCommissions = () => {
    setLoading(true);
    firebaseClient.entities.Commission.list("-created_date", 200).then(data => {
      setCommissions(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCommissions(); }, []);

  const markAsPaid = async (commission) => {
    await firebaseClient.entities.Commission.update(commission.id, {
      status: "Paid",
      paid_date: new Date().toLocaleDateString("en-GH"),
    });
    fetchCommissions();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this commission record?")) return;
    await firebaseClient.entities.Commission.delete(id);
    fetchCommissions();
  };

  const copyMomo = () => {
    navigator.clipboard.writeText(MOMO_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = filterStatus === "All" ? commissions : commissions.filter(c => c.status === filterStatus);
  const totalPending = commissions.filter(c => c.status === "Pending").reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === "Paid").reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Commissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and manage driver commission payments</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Add Commission
        </button>
      </div>

      {/* MoMo Banner */}
      <div className="bg-hy3n-green/10 border border-hy3n-green/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-hy3n-gold/20 border border-hy3n-gold/40 flex items-center justify-center flex-shrink-0">
          <Phone size={20} className="text-hy3n-gold" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">MTN Mobile Money — Commission Payments</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-white tracking-widest">{MOMO_NUMBER}</span>
            <button onClick={copyMomo} className="flex items-center gap-1.5 text-xs text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/10 px-3 py-1.5 rounded-lg transition-colors">
              <Copy size={12} /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Drivers should send commission to this MoMo number, then admin marks as paid below.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          <div className="bg-hy3n-surface border border-hy3n-border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-lg font-bold text-hy3n-red mt-0.5">GHS {totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-hy3n-surface border border-hy3n-border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-lg font-bold text-hy3n-green mt-0.5">GHS {totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["All", "Pending", "Paid"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filterStatus === s ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"}`}>
            {s}
          </button>
        ))}
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
                  <th className="text-left px-5 py-3">Driver</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Period</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Paid Date</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{c.driver_name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{c.driver_phone || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{c.period || "—"}</td>
                    <td className="px-5 py-3 text-right text-white font-semibold">GHS {(c.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${c.status === "Paid" ? "text-hy3n-green bg-hy3n-green/10" : "text-hy3n-red bg-hy3n-red/10"}`}>
                        {c.status === "Paid" ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden lg:table-cell">{c.paid_date || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === "Pending" && (
                          <button onClick={() => markAsPaid(c)} className="text-xs text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/10 px-2 py-1 rounded-lg transition-colors">
                            Mark Paid
                          </button>
                        )}
                        <button onClick={() => { setEditItem(c); setShowForm(true); }} className="text-xs text-hy3n-gold hover:underline">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-xs text-hy3n-red hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-14 text-muted-foreground">No commission records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CommissionForm
          commission={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchCommissions(); }}
        />
      )}
    </div>
  );
}