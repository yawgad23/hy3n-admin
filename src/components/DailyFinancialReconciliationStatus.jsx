import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { adminApi } from "@/api/adminApi";

function money(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status) {
  if (status === "exception") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "attention") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default function DailyFinancialReconciliationStatus() {
  const [result, setResult] = useState({ audit: null, schedule: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await adminApi.latestFinancialReconciliation();
      setResult({ audit: next.audit || null, schedule: next.schedule || null });
    } catch (requestError) {
      setError(requestError.message || "Daily reconciliation status could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const audit = result.audit;
  const scheduleText = result.schedule ? `${result.schedule.localTime} ${result.schedule.timeZone}` : "02:15 Africa/Accra";

  return (
    <section className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white"><Clock3 size={17} className="text-hy3n-gold" /> Daily Ledger & Wallet Reconciliation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Runs automatically every day at {scheduleText}. It reads aggregate records only and never changes a ride, wallet, or payment record.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-hy3n-border px-3 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      {error && <div className="mt-3 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {!loading && !error && !audit && <div className="mt-3 rounded-xl border border-hy3n-border bg-black/10 p-3 text-sm text-muted-foreground">The scheduler is active. The first saved audit will appear after the next daily run.</div>}
      {!loading && audit && <>
        <div className={`mt-3 flex items-start gap-3 rounded-xl border p-3 ${statusStyle(audit.status)}`}>
          {audit.status === "passed" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <div><p className="font-semibold">{audit.status === "passed" ? "No settlement exceptions found" : audit.status === "attention" ? "Audit completed with items needing review" : "Settlement exceptions need review"}</p><p className="mt-1 text-sm text-muted-foreground">Run date: {audit.runDate || "—"} · {audit.exceptionCount || 0} exception(s) · {audit.attentionCount || 0} attention item(s)</p></div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed charges</p><p className="mt-1 font-semibold text-white">{money(audit.rideLedger?.confirmedChargeTotal)}</p><p className="text-xs text-muted-foreground">{audit.rideLedger?.confirmedCompletedRides || 0} final fares</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Wallet-funded rides</p><p className="mt-1 font-semibold text-white">{audit.walletSettlement?.walletFundedCompletedRides || 0}</p><p className="text-xs text-muted-foreground">Expected: {money(audit.walletSettlement?.expectedSettlementTotal)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Matched wallet settlements</p><p className="mt-1 font-semibold text-white">{audit.walletSettlement?.fullyMatchedRides || 0}</p><p className="text-xs text-muted-foreground">Debits: {money(audit.walletSettlement?.riderDebitTotal)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Stale processing wallet items</p><p className="mt-1 font-semibold text-white">{audit.walletTransactions?.staleProcessingCount || 0}</p><p className="text-xs text-muted-foreground">{money(audit.walletTransactions?.staleProcessingAmount)}</p></div>
        </div>

        {(audit.sourceTruncated || audit.exceptions?.length > 0) && <div className="mt-3 space-y-2">{audit.sourceTruncated && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">The source collection safety limit was reached. Treat this audit as incomplete until the backend limit is reviewed.</p>}{audit.exceptions?.map((exception) => <p key={exception.code} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-muted-foreground"><span className="font-medium text-red-300">{label(exception.code)}:</span> {exception.count}{exception.amount ? ` · ${money(exception.amount)}` : ""}</p>)}</div>}
      </>}
    </section>
  );
}
