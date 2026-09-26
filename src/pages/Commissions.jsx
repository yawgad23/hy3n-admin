import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, CreditCard, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { adminApi } from "@/api/adminApi";

const label = {
  paid: { text: "Paid", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", icon: CheckCircle2 },
  processing: { text: "Processing", className: "border-amber-500/30 bg-amber-500/10 text-amber-200", icon: Clock3 },
  failed: { text: "Failed", className: "border-red-500/30 bg-red-500/10 text-red-300", icon: CircleAlert },
  other: { text: "Unrecognized", className: "border-slate-500/30 bg-slate-500/10 text-slate-300", icon: CircleAlert },
};

function currency(value) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(Number(value || 0));
}

export default function Commissions() {
  const [ledger, setLedger] = useState({ records: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.driverFees({ dateFrom, dateTo, status });
      setLedger({ records: result.records || [], summary: result.summary || {} });
    } catch (err) {
      setError(err.message || "The Hubtel Driver fee ledger could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const records = useMemo(() => ledger.records.filter((record) => {
    const term = search.trim().toLowerCase();
    return !term || [record.driverName, record.driverId, record.hubtelReference, record.hubtelTransactionId]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
  }), [ledger.records, search]);

  const cards = [
    { label: "Collected", value: currency(ledger.summary.paidAmount), note: `${ledger.summary.paidCount || 0} confirmed by Hubtel`, color: "text-emerald-300" },
    { label: "Today", value: currency(ledger.summary.todayPaidAmount), note: "confirmed today", color: "text-hy3n-gold" },
    { label: "Awaiting", value: currency(ledger.summary.processingAmount), note: `${ledger.summary.processingCount || 0} Hubtel requests`, color: "text-amber-200" },
    { label: "Failed", value: currency(ledger.summary.failedAmount), note: `${ledger.summary.failedCount || 0} unsuccessful attempts`, color: "text-red-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Driver Fee Ledger</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Read-only financial record of Hubtel-initiated Driver platform-fee payments.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-hy3n-border px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="flex gap-3 rounded-2xl border border-hy3n-green/30 bg-hy3n-green/10 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-hy3n-green" size={18} />
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-hy3n-green">Hubtel only.</span> The dashboard never accepts a manual MoMo number, receipt, or “mark paid” action. A fee is recorded as paid only when the Hubtel payment workflow confirms it.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p><p className={`mt-2 text-xl font-bold ${card.color}`}>{card.value}</p><p className="mt-1 text-xs text-muted-foreground">{card.note}</p></div>)}</div>

      <div className="grid gap-3 rounded-2xl border border-hy3n-border bg-hy3n-surface p-4 lg:grid-cols-4">
        <label className="relative lg:col-span-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Driver or Hubtel reference" className="w-full rounded-xl border border-hy3n-border bg-hy3n-bg py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Start date" className="rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none" />
        <div className="flex gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none"><option value="">All statuses</option><option value="paid">Paid</option><option value="processing">Processing</option><option value="failed">Failed</option></select><button onClick={load} className="rounded-xl bg-hy3n-gold px-3 text-sm font-semibold text-black">Apply</button></div>
      </div>

      {dateFrom || dateTo ? <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{dateFrom || "Start"} — {dateTo || "today"}</span><button onClick={() => { setDateFrom(""); setDateTo(""); setStatus(""); }} className="text-hy3n-gold hover:underline">Clear filters</button></div> : null}

      <div className="overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-hy3n-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Driver</th><th className="px-5 py-3">Fee / service</th><th className="px-5 py-3">Hubtel reference</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">Loading Hubtel ledger…</td></tr> : records.map((record) => { const state = label[record.status] || label.other; const Icon = state.icon; return <tr key={record.id} className="border-b border-hy3n-border/40 last:border-0"><td className="px-5 py-4"><p className="font-medium text-white">{record.driverName}</p><p className="mt-0.5 text-xs text-muted-foreground">{record.driverId ? `ID: ${record.driverId.slice(-8)}` : "Driver ID unavailable"}</p></td><td className="px-5 py-4"><p className="font-semibold text-white">{currency(record.amount)}</p><p className="mt-0.5 capitalize text-xs text-muted-foreground">{record.serviceType}</p></td><td className="px-5 py-4 font-mono text-xs text-hy3n-gold"><p>{record.hubtelTransactionId || "Pending Hubtel transaction"}</p><p className="mt-1 text-muted-foreground">{record.hubtelReference || "No reference"}</p></td><td className="px-5 py-4 text-muted-foreground">{record.date || "—"}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${state.className}`}><Icon size={12} />{state.text}</span></td></tr>; })}{!loading && !records.length && <tr><td colSpan={5} className="py-14 text-center text-muted-foreground">No Hubtel Driver fee records match these filters.</td></tr>}</tbody></table></div></div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><CreditCard size={13} /> Records shown: {records.length} of {ledger.summary.records || 0} returned from the protected ledger.</p>
    </div>
  );
}
