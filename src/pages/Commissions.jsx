import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { firebaseClient } from "@/api/firebaseClient";
import {
  CheckCircle, XCircle, Clock, Phone, Car, Bike, Package,
  RefreshCw, Search, ChevronDown, AlertTriangle, Users, DollarSign,
  Plus, Copy, Wallet
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import CommissionForm from "../components/CommissionForm";

const MOMO_NUMBER = import.meta.env.VITE_MOMO_NUMBER || "0546728330";

const STATUS_STYLES = {
  pending:    { label: "Pending",    bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  processing: { label: "Processing", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ussd_sent:  { label: "USSD Sent",  bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  confirmed:  { label: "Confirmed",  bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  paid:       { label: "Paid",       bg: "bg-green-500/10  text-green-400  border-green-500/20"  },
  failed:     { label: "Failed",     bg: "bg-red-500/10    text-red-400    border-red-500/20"    },
  rejected:   { label: "Rejected",   bg: "bg-red-500/10    text-red-400    border-red-500/20"    },
};

function ServiceIcon({ type }) {
  const t = (type || "car").toLowerCase();
  if (t === "okada")    return <Bike    size={14} className="inline mr-1" />;
  if (t === "delivery") return <Package size={14} className="inline mr-1" />;
  return <Car size={14} className="inline mr-1" />;
}

export default function Commissions() {
  const [activeTab, setActiveTab] = useState("submissions"); // "submissions" or "manual"

  // Live Driver Submissions state (DailyCommission)
  const [records, setRecords]         = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter]   = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [rejectTarget, setRejectTarget]   = useState(null);

  // Manual Ledger state (Commission)
  const [manualCommissions, setManualCommissions] = useState([]);
  const [loadingManual, setLoadingManual] = useState(true);
  const [filterManualStatus, setFilterManualStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch Submissions
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const all = await firebaseClient.entities.DailyCommission.list("-created_date", 500);
      setRecords(all || []);
    } catch (e) {
      console.error("Failed to fetch submissions:", e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Fetch Manual Commissions
  const fetchManual = async () => {
    setLoadingManual(true);
    try {
      const data = await firebaseClient.entities.Commission.list("-created_date", 200);
      setManualCommissions(data || []);
    } catch (e) {
      console.error("Failed to fetch manual commissions:", e);
    } finally {
      setLoadingManual(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchManual();
    const interval = setInterval(() => {
      fetchSubmissions();
      fetchManual();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Live Submission Actions
  const handleConfirm = async (record) => {
    setActionLoading(record.id);
    try {
      await firebaseClient.entities.DailyCommission.update(record.id, {
        status: "paid",
        paid_at: new Date().toISOString(),
        rejection_reason: "",
      });
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
      await fetchSubmissions();
    } finally {
      setActionLoading(null);
    }
  };

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
      await fetchSubmissions();
    } finally {
      setActionLoading(null);
    }
  };

  // Manual Actions
  const markAsPaid = async (commission) => {
    await firebaseClient.entities.Commission.update(commission.id, {
      status: "Paid",
      paid_date: new Date().toLocaleDateString("en-GH"),
    });
    fetchManual();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this commission record?")) return;
    await firebaseClient.entities.Commission.delete(id);
    fetchManual();
  };

  const copyMomo = () => {
    navigator.clipboard.writeText(MOMO_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered Submissions
  const filteredSubmissions = records.filter(r => {
    const matchDate   = !dateFilter || r.date === dateFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search ||
      r.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.momo_reference?.toLowerCase().includes(search.toLowerCase()) ||
      r.driver_phone?.includes(search);
    return matchDate && matchStatus && matchSearch;
  });

  const dateRecords   = records.filter(r => r.date === dateFilter);
  const pendingCount  = dateRecords.filter(r => r.status === "pending").length;
  const paidCount     = dateRecords.filter(r => r.status === "paid").length;
  const totalCollected = dateRecords
    .filter(r => r.status === "paid")
    .reduce((s, r) => s + (r.amount || 0), 0);

  const totalOverall = records
    .filter(r => r.status === "paid")
    .reduce((s, r) => s + (r.amount || 0), 0);

  // Filtered Manual
  const filteredManual = filterManualStatus === "All" ? manualCommissions : manualCommissions.filter(c => c.status === filterManualStatus);
  const totalPendingManual = manualCommissions.filter(c => c.status === "Pending").reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaidManual = manualCommissions.filter(c => c.status === "Paid").reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Commissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and review driver commission payments and live MoMo submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchSubmissions(); fetchManual(); }}
            className="flex items-center gap-2 border border-hy3n-border text-muted-foreground hover:text-white px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <RefreshCw size={15} className={(loadingSubmissions || loadingManual) ? "animate-spin text-hy3n-gold" : ""} />
            <span>Refresh</span>
          </button>
          {activeTab === "manual" && (
            <button
              onClick={() => { setEditItem(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Plus size={16} /> Add Commission
            </button>
          )}
        </div>
      </div>

      {/* Configure Platform Fees Banner */}
      <div className="bg-hy3n-green/10 border border-hy3n-green/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-hy3n-green/20 flex items-center justify-center text-hy3n-green shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Want to configure Platform Fee amounts?</h3>
            <p className="text-xs text-muted-foreground">The required fee per vehicle type is configured on the Pricing engine page.</p>
          </div>
        </div>
        <Link to="/pricing" className="px-4 py-2 bg-hy3n-green text-black font-semibold rounded-xl hover:bg-hy3n-green/90 transition text-xs shrink-0 text-center shadow-sm">
          Configure Platform Fees →
        </Link>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-hy3n-border gap-6">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "submissions" ? "text-hy3n-gold" : "text-muted-foreground hover:text-white"}`}
        >
          Driver Submissions (Live)
          {records.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              {records.filter(r => r.status === "pending").length}
            </span>
          )}
          {activeTab === "submissions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-hy3n-gold" />}
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "manual" ? "text-hy3n-gold" : "text-muted-foreground hover:text-white"}`}
        >
          Manual Ledger
          {activeTab === "manual" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-hy3n-gold" />}
        </button>
      </div>

      {/* TAB 1: LIVE SUBMISSIONS */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
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
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Paid</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{paidCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">drivers active</p>
            </div>
            <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-hy3n-gold" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Date Total</span>
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
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-hy3n-surface border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-xs bg-hy3n-border/50 hover:bg-hy3n-border text-white px-3 py-2.5 rounded-xl transition-colors"
                >
                  All Dates
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-hy3n-surface border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ussd_sent">USSD Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Records list */}
          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-hy3n-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No commission submissions found for the selected filters.</p>
            </div>
          ) : (
            <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hy3n-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Driver</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Service</th>
                      <th className="text-left px-4 py-3">MoMo Phone / Ref</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hy3n-border/50">
                    {filteredSubmissions.map(r => {
                      const st = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                      const isPending = r.status === "pending" || r.status === "processing" || r.status === "ussd_sent";
                      return (
                        <tr key={r.id} className="hover:bg-hy3n-bg/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white text-sm">{r.driver_name || "Driver"}</div>
                            {r.driver_id && <div className="text-xs text-muted-foreground">ID: {r.driver_id.slice(-6)}</div>}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize text-xs">
                            <ServiceIcon type={r.service_type} />
                            {r.service_type || "Car"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-white font-mono text-xs">
                              {r.momo_number ? `${r.momo_network || "MTN"} ${r.momo_number}` : (r.driver_phone || "—")}
                            </div>
                            <div className="text-xs text-hy3n-gold font-mono mt-0.5">
                              Ref: {r.hubtel_transaction_id || r.hubtel_reference || r.momo_reference || "—"}
                            </div>
                            {r.hubtel_message && r.hubtel_message !== "Success" && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 italic max-w-xs truncate">
                                {r.hubtel_message}
                              </div>
                            )}
                            {r.rejection_reason && (
                              <div className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={12} /> {r.rejection_reason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-white">GH₵{r.amount}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                            <div>{r.date}</div>
                            {r.submitted_at && (
                              <div className="text-muted-foreground/60">
                                {format(new Date(r.submitted_at), "h:mm a")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${st.bg}`}>
                              {r.status === "paid" && <CheckCircle size={12} />}
                              {r.status === "rejected" && <XCircle size={12} />}
                              {isPending && <Clock size={12} />}
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleConfirm(r)}
                                    disabled={actionLoading === r.id}
                                    className="px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {actionLoading === r.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => { setRejectTarget(r); setRejectReason(""); }}
                                    disabled={actionLoading === r.id}
                                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <XCircle size={12} />
                                    Reject
                                  </button>
                                </>
                              )}
                              {r.status === "paid" && (
                                <span className="text-xs text-muted-foreground">Confirmed</span>
                              )}
                              {r.status === "rejected" && (
                                <button
                                  onClick={() => handleConfirm(r)}
                                  className="text-xs text-muted-foreground hover:text-white underline"
                                >
                                  Override → Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL LEDGER */}
      {activeTab === "manual" && (
        <div className="space-y-6">
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
                <p className="text-lg font-bold text-hy3n-red mt-0.5">GHS {totalPendingManual.toLocaleString()}</p>
              </div>
              <div className="bg-hy3n-surface border border-hy3n-border rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-lg font-bold text-hy3n-green mt-0.5">GHS {totalPaidManual.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {["All", "Pending", "Paid"].map(s => (
              <button key={s} onClick={() => setFilterManualStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filterManualStatus === s ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
            {loadingManual ? (
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
                    {filteredManual.map(c => (
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
                    {filteredManual.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-14 text-muted-foreground">No commission records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
              <XCircle size={20} />
              Reject Commission Submission
            </div>
            <p className="text-sm text-muted-foreground">
              Rejecting submission from <span className="text-white font-medium">{rejectTarget.driver_name}</span> for{" "}
              <span className="text-white font-medium">GH₵{rejectTarget.amount}</span>.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Reference not found in Hubtel / MoMo statement, wrong amount…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-hy3n-bg border border-hy3n-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/60 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="px-4 py-2 border border-hy3n-border rounded-xl text-sm text-muted-foreground hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectTarget.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === rejectTarget.id && <RefreshCw size={14} className="animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <CommissionForm
          commission={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchManual(); }}
        />
      )}
    </div>
  );
}