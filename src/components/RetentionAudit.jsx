import { Archive, CalendarClock, ShieldCheck } from "lucide-react";

function formatTimestamp(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

export function RetentionAudit({ audit, className = "" }) {
  if (!audit?.inactivatedAt) return null;

  const recordedBy = audit.inactivatedBy || audit.accountStatusUpdatedBy || "system";
  return (
    <section className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-50 ${className}`} aria-label="Retained account audit">
      <div className="flex items-center gap-2 font-semibold text-amber-200"><Archive size={14} /> Retention audit</div>
      <p className="mt-1.5 flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-amber-300" /> Inactivated {formatTimestamp(audit.inactivatedAt)} by {recordedBy}.</p>
      <p className="mt-1 flex items-start gap-1.5"><CalendarClock size={13} className="mt-0.5 shrink-0 text-amber-300" /> Records are retained for review until at least {formatTimestamp(audit.retentionReviewAfter)}.</p>
    </section>
  );
}
