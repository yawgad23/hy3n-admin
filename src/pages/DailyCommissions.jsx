import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import {
  CheckCircle, XCircle, Clock, Phone, Car, Bike, Package,
  RefreshCw, Search, ChevronDown, AlertTriangle, Users, DollarSign
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";

const STATUS_STYLES = {
  pending:   { label: "Pending",   bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  confirmed: { label: "Confirmed", bg: "bg-green-500/10  text-green-400  border-green-500/20"  },
  rejected:  { label: "Rejected",  bg: "bg-red-500/10   text-red-400    border-red-500/20"    },
};

function ServiceIcon({ type }) {
  const t = (type || "car").toLowerCase();
  if (t === "okada")    return <Bike    size={14} className="inline mr-1" />;
  if (t === "delivery") return <Package size={14} className="inline mr-1" />;
  return <Car size={14} className="inline mr-1" />;
}

export default function DailyCommissions() {
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [rejectTarget, setRejectTarget]   = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const all = await firebaseClient.entities.DailyCommission.list("-created_date", 500);
      setRecords(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Auto-refresh every 20 seconds to catch new submissions
    const interval = setInterval(fetchRecords, 20000);
    return () => clearInterval(interval);
  }, []);

  // Confirm a payment → set status to confirmed
  const handleConfirm = async (record) => {
    setActionLoading(record.id);
    try {
      await firebaseClient.entities.DailyCommission.update(record.id, {
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        rejection_reason: "",
      });
      // Also update the driver profile to mark commission_paid_today
      if (record.driver_id) {
        try {
          const profiles = await firebaseClient.entities.DriverProfile.filter({ user_id: record.driver_id });
          if (profiles.length > 0) {
            await firebaseClient.entities.DriverProfile.update(profiles[0].id, {
              commission_paid_today: true,
              commission_paid_date: record.date,
            });
          }
        } catch (e) {
          console.warn("Could not update driver profile commission flag:", e);
        }
      }
      await fetchRecords();
    } finally {
      setActionLoading(null);
    }
  };

  // Reject a payment
  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await firebaseClient.entities.DailyCommission.update(rejectTarget.id, {
        status: "rejected",
        rejection_reason: rejectReason || "Reference could not be verified",
        rejected_at: new Date().toISOString(),
      });
      setRejectTarget(null);
      setRejectReason("");
      await fetchRecords();
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered records
  const filtered = records.filter(r => {
    const matchDate   = !dateFilter || r.date === dateFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search ||
      r.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.momo_reference?.toLowerCase().includes(search.toLowerCase()) ||
      r.driver_phone?.includes(search);
    return matchDate && matchStatus && matchSearch;
  });

  // Summary stats for the selected date
  const dateRecords   = records.filter(r => r.date === dateFilter);
  const pendingCount  = dateRecords.filter(r => r.status === "pending").length;
  const confirmedCount = dateRecords.filter(r => r.status === "confirmed").length;
  const totalCollected = dateRecords
    .filter(r => r.status === "confirmed")
    .reduce((s, r) => s + (r.amount || 0), 0);

  // Overall stats
  const totalOverall = records
    .filter(r => r.status === "confirmed")
    .reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Commission Payments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review and confirm driver daily fee submissions
          </p>
        </div>
        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 border border-hy3n-border text-muted-foreground hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">awaiting review</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Confirmed</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{confirmedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">drivers active</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-hy3n-gold" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Daily Total</span>
          </div>
          <p className="text-2xl font-bold text-hy3n-gold">GH₵{totalCollected}</p>
          <p className="text-xs text-muted-foreground mt-0.5">for selected date</p>
        </div>
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-blue-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Overall</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">GH₵{totalOverall}</p>
          <p className="text-xs text-muted-foreground mt-0.5">all-time commission</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search driver name, phone, or MoMo ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="bg-hy3n-surface border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-hy3n-surface border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Records list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-hy3n-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No commission records found for the selected filters.</p>
          {pendingCount === 0 && confirmedCount === 0 && (
            <p className="text-xs mt-2 opacity-60">Drivers submit their MoMo reference from the driver app.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(record => {
            const style = STATUS_STYLES[record.status] || STATUS_STYLES.pending;
            const isProcessing = actionLoading === record.id;
            return (
              <div
                key={record.id}
                className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Driver info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{record.driver_name || "Unknown Driver"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${style.bg}`}>
                        {style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                      {record.driver_phone && (
                        <a href={`tel:${record.driver_phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                          <Phone size={11} /> {record.driver_phone}
                        </a>
                      )}
                      <span className="flex items-center gap-1">
                        <ServiceIcon type={record.service_type} />
                        {(record.service_type || "Car").charAt(0).toUpperCase() + (record.service_type || "Car").slice(1)}
                      </span>
                      {record.vehicle_plate && (
                        <span className="font-mono bg-hy3n-bg px-2 py-0.5 rounded text-white/70">{record.vehicle_plate}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-hy3n-gold">GH₵{record.amount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Expected: GH₵{(record.service_type === "okada" || record.service_type === "delivery") ? 30 : 50}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {record.date ? format(parseISO(record.date), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>

                {/* MoMo reference */}
                <div className="mt-3 bg-hy3n-bg rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">MoMo Transaction Reference</p>
                    <p className="font-mono font-bold text-white text-sm tracking-wider mt-0.5">
                      {record.momo_reference || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-xs text-white mt-0.5">
                      {record.submitted_at ? format(new Date(record.submitted_at), "h:mm a") : "—"}
                    </p>
                  </div>
                </div>

                {/* Rejection reason if rejected */}
                {record.status === "rejected" && record.rejection_reason && (
                  <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{record.rejection_reason}</p>
                  </div>
                )}

                {/* Confirmed info */}
                {record.status === "confirmed" && record.confirmed_at && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle size={13} />
                    Confirmed at {format(new Date(record.confirmed_at), "h:mm a, MMM d")}
                  </div>
                )}

                {/* Action buttons — only for pending */}
                {record.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleConfirm(record)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle size={15} />
                      )}
                      Confirm Payment
                    </button>
                    <button
                      onClick={() => setRejectTarget(record)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Re-confirm option for rejected */}
                {record.status === "rejected" && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleConfirm(record)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      <CheckCircle size={15} />
                      Confirm Anyway
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-hy3n-border">
              <h3 className="font-semibold text-white">Reject Payment</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rejectTarget.driver_name} — Ref: <span className="font-mono">{rejectTarget.momo_reference}</span>
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Reason for rejection (driver will see this)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Reference not found in MoMo records"
                  rows={3}
                  className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/60 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectTarget?.id}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                >
                  {actionLoading === rejectTarget?.id ? "Rejecting…" : "Reject Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
