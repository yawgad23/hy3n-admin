import { AlertTriangle, Pencil, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

function initialForm(account, role) {
  return {
    role,
    fullName: account?.fullName || "",
    email: account?.email || "",
    phone: account?.phone || "",
    reason: "",
  };
}

/**
 * Narrow account-repair form. It intentionally cannot edit a user ID, trip or
 * wallet record, Driver approval, documents, or vehicle details.
 */
export default function AccountCorrectionDialog({ account, role, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => initialForm(account, role));

  useEffect(() => setForm(initialForm(account, role)), [account, role]);

  if (!account) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({
      role,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      reason: form.reason.trim(),
    });
  };
  const title = role === "driver" ? "Correct Driver account" : "Correct Rider account";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="account-correction-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hy3n-border bg-hy3n-surface p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hy3n-gold/15 text-hy3n-gold"><Pencil size={17} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-hy3n-gold">Admin correction</p>
              <h2 id="account-correction-title" className="mt-1 text-lg font-bold text-white">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Correct a genuine identity or contact mistake for {account.fullName || "this account"}.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account correction" disabled={saving} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white disabled:opacity-50"><X size={18} /></button>
        </header>

        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <div className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={15} /><p><strong>Protected correction:</strong> account ID, trips, wallet/payment records, Driver approval, documents, and vehicle details cannot be changed here. Email and phone must remain unique within the same app; the same contact may still be used in the other HY3N app.</p></div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-xs text-muted-foreground">Full name<input required minLength={2} maxLength={120} value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>
          <label className="block text-xs text-muted-foreground">Email address<input required type="email" maxLength={254} value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>
          <label className="block text-xs text-muted-foreground">Ghana mobile number<input required type="tel" maxLength={40} value={form.phone} onChange={(event) => update("phone", event.target.value)} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>
          <label className="block text-xs text-muted-foreground">Reason for correction<textarea required minLength={3} maxLength={500} rows={3} value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="Example: Corrected number entered with a digit missing." className="mt-1.5 w-full resize-y rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-hy3n-gold/60" /></label>
        </div>

        <p className="mt-4 flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-hy3n-green" size={15} />The correction reason, changed field names, administrator, and timestamp will appear in the protected account audit log.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-hy3n-border py-2.5 text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50">Cancel</button>
          <button disabled={saving} className="flex-1 rounded-xl bg-hy3n-gold py-2.5 text-sm font-semibold text-black hover:bg-hy3n-gold/90 disabled:opacity-50">{saving ? "Saving…" : "Save correction"}</button>
        </div>
      </form>
    </div>
  );
}
