import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { adminApi } from "@/api/adminApi";
import DailyFinancialReconciliationStatus from "@/components/DailyFinancialReconciliationStatus";

function money(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

/**
 * Protected financial view. Confirmed charges come from the persisted final
 * fare. Legacy quote-only records remain visible, but never inflate revenue.
 */
export default function RideFinancialLedger({ compact = false }) {
  const [ledger, setLedger] = useState({ records: [], summary: {}, accountingBasis: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.rideFinancials();
      setLedger({
        records: result.records || [],
        summary: result.summary || {},
        accountingBasis: result.accountingBasis || {},
      });
    } catch (requestError) {
      setError(requestError.message || "Ride financial records could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const records = useMemo(
    () => compact ? ledger.records.slice(0, 8) : ledger.records,
    [compact, ledger.records],
  );
  const summary = ledger.summary;
  const cards = [
    { label: "Completed Fare", value: money(summary.fareAmountTotal), note: `${summary.confirmedCompletedRides || 0} confirmed final fares · includes waiting fees`, color: "text-emerald-300" },
    { label: "Waiting Fee Portion", value: money(summary.waitingFeeTotal), note: "Already included in completed fare", color: "text-hy3n-gold" },
    { label: "Ride Charges", value: money(summary.totalRideCharge), note: "Confirmed final fare plus any confirmed tip", color: "text-cyan-300" },
    { label: "Legacy Quote Estimates", value: money(summary.legacyQuoteEstimateTotal), note: `${summary.legacyQuoteEstimateRides || 0} records · excluded from charges`, color: "text-amber-300" },
    { label: "Cancellation Penalties", value: money(summary.cancellationPenaltyTotal), note: `${summary.cancelledRides || 0} cancelled rides · current policy is GH₵0`, color: "text-red-300" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><ReceiptText size={18} className="text-hy3n-gold" /> Ride Financial Ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">Confirmed final fares, waiting-fee components, cancellation penalties, and separately labelled legacy estimates.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-hy3n-border px-3 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="flex gap-3 rounded-2xl border border-hy3n-green/30 bg-hy3n-green/10 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-hy3n-green" size={18} />
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-hy3n-green">No double counting.</span> The waiting fee is a visible component of the confirmed completed fare and is not added again to Ride Charges. A ride amount is not proof of cash collection; reconcile payment-provider records separately.</p>
      </div>

      <DailyFinancialReconciliationStatus />

      {Number(summary.legacyQuoteEstimateRides || 0) > 0 && <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><AlertCircle className="mt-0.5 shrink-0 text-amber-300" size={18} /><p className="text-sm text-muted-foreground"><span className="font-semibold text-amber-300">Legacy estimate records are excluded.</span> {summary.legacyQuoteEstimateRides} historical completed ride record(s) have no persisted final fare. Their quote estimate is shown for audit only and is not included in revenue, rider charges, or Driver earnings.</p></div>}
      {error && <div className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {cards.map((card) => <div key={card.label} className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p><p className={`mt-2 text-xl font-bold ${card.color}`}>{card.value}</p><p className="mt-1 text-xs text-muted-foreground">{card.note}</p></div>)}
      </div>

      {!compact && <div className="overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-hy3n-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Ride / status</th><th className="px-5 py-3">Completed or cancelled</th><th className="px-5 py-3 text-right">Final fare</th><th className="px-5 py-3 text-right">Waiting fee component</th><th className="px-5 py-3 text-right">Cancellation penalty</th><th className="px-5 py-3 text-right">Ride charge</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="py-14 text-center text-muted-foreground">Loading server financial ledger…</td></tr> : records.map((record) => { const cancelled = record.status === "cancelled"; const legacyQuote = record.fareSource === "legacy_quote_estimate"; return <tr key={record.id} className="border-b border-hy3n-border/40 last:border-0"><td className="px-5 py-4"><p className="font-medium text-white">{record.riderName} <span className="text-muted-foreground">→</span> {record.driverName || "Unassigned"}</p><p className="mt-1 text-xs text-muted-foreground">{record.category || "Ride"} · {record.id.slice(-10)}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${cancelled ? "bg-red-500/10 text-red-300" : legacyQuote ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>{cancelled ? "Cancelled" : legacyQuote ? "Legacy estimate" : "Completed"}</span><p className="mt-1 text-xs text-muted-foreground">{dateTime(cancelled ? record.cancelledAt : record.completedAt)}</p></td><td className="px-5 py-4 text-right font-medium text-white">{legacyQuote ? <><p>—</p><p className="mt-1 text-xs text-amber-300">Quote: {money(record.legacyQuoteEstimate)}</p></> : money(record.fareAmount)}</td><td className="px-5 py-4 text-right"><p className="font-medium text-hy3n-gold">{money(record.waitingFee)}</p>{record.waitingFee > 0 && <p className="mt-1 text-xs text-muted-foreground"><Clock3 size={11} className="mr-1 inline" />{record.chargeableWaitingMinutes} chargeable min · {money(record.waitingFeeRate)}/min</p>}</td><td className="px-5 py-4 text-right font-medium text-red-300">{money(record.cancellationPenalty)}</td><td className="px-5 py-4 text-right font-semibold text-cyan-300">{legacyQuote ? "Not posted" : money(record.totalRideCharge)}</td></tr>; })}{!loading && !records.length && <tr><td colSpan={6} className="py-14 text-center text-muted-foreground">No completed or cancelled rides are available for this financial report.</td></tr>}</tbody></table></div></div>}

      {ledger.accountingBasis.waitingFee && <p className="text-xs text-muted-foreground">Basis: {ledger.accountingBasis.waitingFee}</p>}
    </section>
  );
}
