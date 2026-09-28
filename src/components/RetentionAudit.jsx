import { Archive, CalendarClock, ShieldCheck, X } from "lucide-react";

function formatTimestamp(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function readableAction(action) {
  return String(action || "account_status_updated").replace(/_/g, " ");
}

export function RetentionAudit({ audit, className = "", onView }) {
  if (!audit?.inactivatedAt) return null;

  const recordedBy = audit.inactivatedBy || audit.accountStatusUpdatedBy || "system";
  return (
    <section className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-50 ${className}`} aria-label="Retained account audit">
      <div className="flex items-center justify-between gap-2 font-semibold text-amber-200"><span className="flex items-center gap-2"><Archive size={14} /> Retention audit</span>{onView && <button onClick={onView} className="rounded-md border border-amber-400/30 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-400/10">View log</button>}</div>
      <p className="mt-1.5 flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-amber-300" /> Inactivated {formatTimestamp(audit.inactivatedAt)} by {recordedBy}.</p>
      <p className="mt-1 flex items-start gap-1.5"><CalendarClock size={13} className="mt-0.5 shrink-0 text-amber-300" /> Records are retained for review until at least {formatTimestamp(audit.retentionReviewAfter)}.</p>
    </section>
  );
}

export function LifecycleAuditDialog({ account, events, error, onClose }) {
  const audit = account?.retentionAudit || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hy3n-border bg-hy3n-surface shadow-2xl" aria-label="Account lifecycle audit">
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-hy3n-border bg-hy3n-surface px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Retained account</p><h2 className="mt-1 text-lg font-bold text-white">{account?.fullName}</h2><p className="mt-0.5 text-xs text-muted-foreground">Lifecycle events are visible only to authorized administrators.</p></div>
          <button onClick={onClose} aria-label="Close account lifecycle audit" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>
        <div className="space-y-4 p-5">
          <RetentionAudit audit={audit} />
          <div><h3 className="text-sm font-semibold text-white">Preserved activity log</h3>{error ? <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : events?.length ? <ol className="mt-3 space-y-2">{events.map((event) => <li key={event.id} className="rounded-xl border border-hy3n-border bg-hy3n-bg p-3 text-xs"><p className="font-medium capitalize text-white">{readableAction(event.action)}</p><p className="mt-1 text-muted-foreground">{formatTimestamp(event.createdAt)} · {event.actorType} {event.actorId ? `(${event.actorId})` : ""}</p>{event.retentionReviewAfter && <p className="mt-1 text-amber-200">Retention review after: {formatTimestamp(event.retentionReviewAfter)}</p>}</li>)}</ol> : <p className="mt-2 rounded-xl border border-hy3n-border bg-hy3n-bg p-3 text-xs text-muted-foreground">No lifecycle event exists for this legacy inactive account. The retention summary above remains preserved.</p>}</div>
        </div>
      </section>
    </div>
  );
}
