import { useState, useEffect, useMemo } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import {
  DollarSign, CheckSquare, Wallet, CreditCard, Car, RefreshCw,
  Search, Calendar, Filter, ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle2, XCircle, AlertCircle, Phone, ExternalLink, X, FileText
} from "lucide-react";
import { format, parseISO, isValid, startOfDay, endOfDay, subDays } from "date-fns";

const TYPE_CONFIG = {
  commission: { label: "Commission", icon: Wallet, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  payout: { label: "Payout", icon: CreditCard, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  ride_fare: { label: "Ride Fare", icon: Car, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  payment: { label: "MoMo Payment", icon: DollarSign, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  wallet_tx: { label: "Wallet Tx", icon: FileText, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
};

const STATUS_CONFIG = {
  paid: { label: "Paid", icon: CheckCircle2, bg: "bg-green-500/10 text-green-400 border-green-500/20" },
  completed: { label: "Completed", icon: CheckCircle2, bg: "bg-green-500/10 text-green-400 border-green-500/20" },
  success: { label: "Success", icon: CheckCircle2, bg: "bg-green-500/10 text-green-400 border-green-500/20" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  processing: { label: "Processing", icon: Clock, bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ussd_sent: { label: "USSD Sent", icon: Clock, bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  pending: { label: "Pending", icon: Clock, bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  failed: { label: "Failed", icon: XCircle, bg: "bg-red-500/10 text-red-400 border-red-500/20" },
  rejected: { label: "Rejected", icon: XCircle, bg: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelled", icon: XCircle, bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20" },
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      // Fetch each collection individually so one failure can't block others
      const safeFetch = async (label, fn) => {
        try {
          const result = await fn();
          console.log(`[Transactions] ${label}: fetched ${result?.length ?? 0} records`, result);
          return result || [];
        } catch (err) {
          console.error(`[Transactions] ${label}: FAILED`, err);
          return [];
        }
      };

      const dailyFees   = await safeFetch("DailyCommission", () => firebaseClient.entities.DailyCommission?.list("-created_date", 400));
      const commissions = await safeFetch("Commission",      () => firebaseClient.entities.Commission?.list("-created_date", 300));
      const payouts     = await safeFetch("Payout",          () => firebaseClient.entities.Payout?.list("-created_date", 300));
      const rides       = await safeFetch("Ride(completed)", () => firebaseClient.entities.Ride?.filter({ status: "completed" }, "-created_date", 400));
      const payments    = await safeFetch("Payment",         () => firebaseClient.entities.Payment?.list("-created_date", 300));
      const walletTxs   = await safeFetch("WalletTransaction", () => firebaseClient.entities.WalletTransaction?.list("-created_date", 300));

      console.log("[Transactions] Summary — dailyFees:", dailyFees.length, "commissions:", commissions.length, "payouts:", payouts.length, "rides:", rides.length, "payments:", payments.length, "walletTxs:", walletTxs.length);

      const unified = [];

      // ─── Safe date helpers ───────────────────────────────────────────────────
      // Firestore Timestamps have a .toDate() method; strings are ISO dates.
      // This converts anything to a JS Date (or null on failure).
      const toDate = (val) => {
        if (!val) return null;
        if (val?.toDate) return val.toDate();          // Firestore Timestamp
        if (val instanceof Date) return val;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };
      const fmtDate = (val) => {
        const d = toDate(val);
        if (!d) return "—";
        try { return format(d, "PPpp"); } catch { return d.toISOString(); }
      };
      const toISO = (val) => {
        const d = toDate(val);
        return d ? d.toISOString() : "";
      };

      // 1. Commissions (from DailyCommission)
      for (const item of dailyFees) {
        try {
          const rawDate = item.submitted_at || item.created_date || item.date || item.created_at;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `commission_${item.id}`,
            rawId: item.id,
            type: "commission",
            amount: Number(item.amount || 0),
            user: item.driver_name || "Driver",
            phone: item.momo_number || item.driver_phone || "",
            status: (item.status || "pending").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.hubtel_transaction_id || item.hubtel_reference || item.momo_reference || item.id,
            details: {
              ServiceType: item.service_type || "Car",
              MoMoNetwork: item.momo_network || "MTN",
              MoMoNumber: item.momo_number || "—",
              HubtelRef: item.hubtel_reference || "—",
              HubtelTxId: item.hubtel_transaction_id || "—",
              ProviderMessage: item.hubtel_message || item.rejection_reason || "—",
              SubmittedAt: fmtDate(rawDate),
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip commission item", item.id, e); }
      }

      // 2. Commissions
      for (const item of commissions) {
        try {
          const rawDate = item.created_date || item.date || item.created_at;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `commission_${item.id}`,
            rawId: item.id,
            type: "commission",
            amount: Number(item.amount || item.commission_amount || 0),
            user: item.driver_name || `Driver (${item.driver_id?.slice(0, 6) || "—"})`,
            phone: "",
            status: (item.status || "completed").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.reference || item.ride_id || item.id,
            details: {
              RideId: item.ride_id || "—",
              FareAmount: item.fare ? `GH₵${item.fare}` : "—",
              CommissionRate: item.rate ? `${item.rate}%` : "—",
              Date: fmtDate(rawDate),
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip commission item", item.id, e); }
      }

      // 3. Payouts
      for (const item of payouts) {
        try {
          const rawDate = item.created_date || item.requested_at || item.updated_date;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `payout_${item.id}`,
            rawId: item.id,
            type: "payout",
            amount: Number(item.amount || 0),
            user: item.driver_name || `Driver (${item.driver_id?.slice(0, 6) || "—"})`,
            phone: item.momo_number || item.phone || "",
            status: (item.status || "pending").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.transaction_reference || item.reference || item.id,
            details: {
              Method: item.payout_method || item.network || "MoMo",
              AccountNo: item.momo_number || item.account_number || "—",
              RequestedAt: fmtDate(rawDate),
              AdminNotes: item.admin_notes || item.rejection_reason || "—",
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip payout item", item.id, e); }
      }

      // 4. Ride Fares
      for (const item of rides) {
        try {
          const rawDate = item.completed_at || item.created_date || item.created_at;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `ride_fare_${item.id}`,
            rawId: item.id,
            type: "ride_fare",
            amount: Number(item.fare || item.final_fare || item.estimated_fare || 0),
            user: `${item.rider_name || "Rider"} → ${item.driver_name || "Driver"}`,
            phone: item.driver_phone || item.rider_phone || "",
            status: (item.status || "completed").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.id,
            details: {
              Pickup: item.pickup_address || item.pickup?.address || "—",
              Destination: item.destination_address || item.destination?.address || "—",
              RiderName: item.rider_name || "—",
              DriverName: item.driver_name || "—",
              PaymentMethod: (item.payment_method || "cash").toUpperCase(),
              Distance: item.distance ? `${item.distance} km` : "—",
              CompletedAt: fmtDate(rawDate),
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip ride_fare item", item.id, e); }
      }

      // 5. MoMo & Public Payments
      for (const item of payments) {
        try {
          const rawDate = item.created_date || item.createdAt || item.timestamp;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `payment_${item.id}`,
            rawId: item.id,
            type: "payment",
            amount: Number(item.amount || 0),
            user: item.customerName || item.user_name || "Customer",
            phone: item.customerMsisdn || item.phone || "",
            status: (item.status || "pending").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.reference || item.clientReference || item.transaction_id || item.id,
            details: {
              Channel: item.channel || item.network || "—",
              Description: item.description || "—",
              ClientRef: item.clientReference || item.reference || "—",
              Timestamp: fmtDate(rawDate),
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip payment item", item.id, e); }
      }

      // 6. Wallet Transactions
      for (const item of walletTxs) {
        try {
          const rawDate = item.created_date || item.createdAt || item.timestamp;
          const dateISO = toISO(rawDate);
          const dateObj = toDate(rawDate) || new Date(0);
          unified.push({
            id: `wallet_tx_${item.id}`,
            rawId: item.id,
            type: "wallet_tx",
            amount: Number(item.amount || 0),
            user: item.user_name || `User (${item.user_id?.slice(0, 6) || "—"})`,
            phone: item.phone || "",
            status: (item.status || "completed").toLowerCase(),
            dateStr: dateISO,
            dateObj,
            reference: item.reference || item.transaction_id || item.id,
            details: {
              TxType: item.tx_type || item.type || "—",
              Description: item.description || "—",
              BalanceAfter: item.balance_after !== undefined ? `GH₵${item.balance_after}` : "—",
              Timestamp: fmtDate(rawDate),
            },
            raw: item,
          });
        } catch (e) { console.warn("[Transactions] skip wallet_tx item", item.id, e); }
      }

      // Sort descending by date
      unified.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setTransactions(unified);
    } catch (err) {
      console.error("[Transactions] Error fetching ledgers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  // Filter Logic
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Type Filter
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      
      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "success") {
          const ok = ["paid", "completed", "success", "confirmed"].includes(tx.status);
          if (!ok) return false;
        } else if (statusFilter === "pending") {
          const ok = ["pending", "processing", "ussd_sent"].includes(tx.status);
          if (!ok) return false;
        } else if (statusFilter === "failed") {
          const ok = ["failed", "rejected", "cancelled"].includes(tx.status);
          if (!ok) return false;
        } else if (tx.status !== statusFilter) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate) {
        const start = startOfDay(new Date(startDate)).getTime();
        if (tx.dateObj.getTime() < start) return false;
      }
      if (endDate) {
        const end = endOfDay(new Date(endDate)).getTime();
        if (tx.dateObj.getTime() > end) return false;
      }

      // Search Filter
      if (search) {
        const q = search.toLowerCase();
        const matchUser = tx.user?.toLowerCase().includes(q);
        const matchPhone = tx.phone?.toLowerCase().includes(q);
        const matchRef = tx.reference?.toLowerCase().includes(q);
        const matchId = tx.rawId?.toLowerCase().includes(q);
        if (!matchUser && !matchPhone && !matchRef && !matchId) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, startDate, endDate, search]);

  // Aggregated Summary Cards
  const stats = useMemo(() => {
    let commissionFeesTotal = 0;
    let rideFaresTotal = 0;
    let payoutsTotal = 0;

    for (const tx of filtered) {
      if (["paid", "completed", "success", "confirmed"].includes(tx.status)) {
        if (tx.type === "commission_fee" || tx.type === "commission" || tx.type === "daily_fee") commissionFeesTotal += tx.amount;
        if (tx.type === "ride_fare") rideFaresTotal += tx.amount;
        if (tx.type === "payout") payoutsTotal += tx.amount;
      }
    }

    return {
      count: filtered.length,
      commissionFeesTotal,
      rideFaresTotal,
      payoutsTotal,
    };
  }, [filtered]);

  const setPresetDate = (preset) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7days") {
      setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hy3n-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <DollarSign className="text-hy3n-gold" size={28} />
            Platform Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive real-time financial ledger of commission fees, driver payouts, and trip fares.
          </p>
        </div>
        <button
          onClick={fetchAllTransactions}
          disabled={loading}
          className="flex items-center gap-2 bg-hy3n-surface border border-hy3n-border hover:border-hy3n-gold/50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all self-start md:self-auto"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-hy3n-gold" : "text-hy3n-gold"} />
          Refresh Ledger
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 relative overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtered Transactions</p>
          <p className="text-2xl font-black text-white mt-1">{stats.count.toLocaleString()}</p>
          <div className="absolute top-4 right-4 text-hy3n-gold/20">
            <FileText size={36} />
          </div>
        </div>

        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 relative overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commissions</p>
          <p className="text-2xl font-black text-amber-400 mt-1">GH₵{stats.commissionFeesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute top-4 right-4 text-amber-500/20">
            <Wallet size={36} />
          </div>
        </div>

        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 relative overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ride Fares Processed</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">GH₵{stats.rideFaresTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute top-4 right-4 text-emerald-500/20">
            <Car size={36} />
          </div>
        </div>

        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-5 relative overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver Payouts</p>
          <p className="text-2xl font-black text-purple-400 mt-1">GH₵{stats.payoutsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="absolute top-4 right-4 text-purple-500/20">
            <CreditCard size={36} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user, phone, reference or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          >
            <option value="all">All Transaction Types</option>
            <option value="commission">Commissions</option>
            <option value="payout">Driver Payouts</option>
            <option value="ride_fare">Ride Fares</option>
            <option value="payment">MoMo & Public Payments</option>
            <option value="wallet_tx">Wallet Transactions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful / Paid / Confirmed</option>
            <option value="pending">Processing / Pending / USSD Sent</option>
            <option value="failed">Failed / Rejected / Cancelled</option>
          </select>
        </div>

        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-hy3n-border/40">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={15} className="text-hy3n-gold" />
            <span>Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-hy3n-bg border border-hy3n-border text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-hy3n-gold/60"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-hy3n-bg border border-hy3n-border text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-hy3n-gold/60"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <X size={12} /> Clear Dates
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Presets:</span>
            <button onClick={() => setPresetDate("today")} className="text-xs bg-hy3n-bg hover:bg-hy3n-border text-white px-3 py-1.5 rounded-lg transition-colors border border-hy3n-border/60">
              Today
            </button>
            <button onClick={() => setPresetDate("7days")} className="text-xs bg-hy3n-bg hover:bg-hy3n-border text-white px-3 py-1.5 rounded-lg transition-colors border border-hy3n-border/60">
              Last 7 Days
            </button>
            <button onClick={() => setPresetDate("all")} className="text-xs bg-hy3n-bg hover:bg-hy3n-border text-white px-3 py-1.5 rounded-lg transition-colors border border-hy3n-border/60">
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-hy3n-gold border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Aggregating platform ledgers…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-12 text-center text-muted-foreground">
          <Filter size={44} className="mx-auto mb-3 opacity-30 text-hy3n-gold" />
          <p className="text-base font-semibold text-white">No transactions match your criteria</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">Try adjusting your date range, search query, or status filters to view historical records.</p>
        </div>
      ) : (
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hy3n-border bg-hy3n-bg/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">User / Parties</th>
                  <th className="py-3.5 px-4">Reference / ID</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hy3n-border/40 text-sm">
                {filtered.map(tx => {
                  const tConfig = TYPE_CONFIG[tx.type] || TYPE_CONFIG.payment;
                  const Icon = tConfig.icon;
                  const sConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                  const StatusIcon = sConfig.icon;
                  const isIncoming = ["commission", "ride_fare", "payment"].includes(tx.type);
                  const isOutgoing = tx.type === "payout";

                  return (
                    <tr key={tx.id} className="hover:bg-hy3n-bg/40 transition-colors group">
                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${tConfig.color}`}>
                          <Icon size={13} />
                          {tConfig.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs">
                        {tx.dateObj.getTime() > 0 ? format(tx.dateObj, "MMM d, yyyy · h:mm a") : "—"}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-semibold text-white truncate">{tx.user}</div>
                        {tx.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {tx.phone}
                          </div>
                        )}
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-white/80 bg-hy3n-bg px-2 py-1 rounded border border-hy3n-border/60 select-all">
                          {tx.reference}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold">
                        <span className={isIncoming ? "text-green-400" : isOutgoing ? "text-purple-400" : "text-amber-400"}>
                          {isOutgoing ? "-" : ""}GH₵{tx.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sConfig.bg}`}>
                          <StatusIcon size={12} />
                          {sConfig.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="text-xs bg-hy3n-bg hover:bg-hy3n-gold hover:text-black text-white px-3 py-1.5 rounded-lg font-semibold transition-all border border-hy3n-border/60"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-hy3n-surface border border-hy3n-border rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-hy3n-bg px-6 py-4 border-b border-hy3n-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl border ${TYPE_CONFIG[selectedTx.type]?.color || ""}`}>
                  {(() => {
                    const Icon = TYPE_CONFIG[selectedTx.type]?.icon || DollarSign;
                    return <Icon size={18} />;
                  })()}
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">Transaction Details</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedTx.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-hy3n-border/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Amount & Status Badge */}
              <div className="flex items-center justify-between bg-hy3n-bg/60 p-4 rounded-2xl border border-hy3n-border/60">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Amount</p>
                  <p className="text-3xl font-black text-hy3n-gold mt-0.5">GH₵{selectedTx.amount.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedTx.status]?.bg || ""}`}>
                    {STATUS_CONFIG[selectedTx.status]?.label || selectedTx.status}
                  </span>
                </div>
              </div>

              {/* General Metadata */}
              <div className="space-y-2.5 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-hy3n-border/40 pb-1">
                  General Info
                </p>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Transaction Type</span>
                  <span className="font-semibold text-white">{TYPE_CONFIG[selectedTx.type]?.label || selectedTx.type}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="text-white text-right">{selectedTx.dateObj.getTime() > 0 ? format(selectedTx.dateObj, "PPpp") : "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Primary User</span>
                  <span className="font-semibold text-white text-right">{selectedTx.user}</span>
                </div>
                {selectedTx.phone && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Phone Number</span>
                    <a href={`tel:${selectedTx.phone}`} className="text-hy3n-gold hover:underline font-mono flex items-center gap-1">
                      {selectedTx.phone} <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">System Doc ID</span>
                  <span className="font-mono text-xs text-white/70 bg-hy3n-bg px-2 py-0.5 rounded">{selectedTx.rawId}</span>
                </div>
              </div>

              {/* Specific Details */}
              {selectedTx.details && Object.keys(selectedTx.details).length > 0 && (
                <div className="space-y-2.5 text-sm pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-hy3n-border/40 pb-1">
                    Specific Metadata
                  </p>
                  {Object.entries(selectedTx.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-start gap-4 py-1">
                      <span className="text-muted-foreground shrink-0">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-white font-mono text-xs text-right break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw JSON Inspect */}
              <div className="pt-2">
                <details className="text-xs text-muted-foreground group">
                  <summary className="cursor-pointer hover:text-white font-semibold flex items-center gap-1">
                    <span>Inspect Raw Record Data</span>
                  </summary>
                  <pre className="mt-2 p-3 bg-black/60 rounded-xl border border-hy3n-border/60 text-white/80 overflow-x-auto max-h-48 text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(selectedTx.raw, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-hy3n-bg px-6 py-4 border-t border-hy3n-border flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="bg-hy3n-surface hover:bg-hy3n-border text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all border border-hy3n-border/60"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
