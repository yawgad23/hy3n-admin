import { useEffect, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";

export default function AdminAccessCodeGate({ onVerified, verify }) {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const input = document.getElementById("hy3n-admin-access-code");
    input?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const value = accessCode.trim();
    if (!value) {
      setError("Enter the administrator access code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await verify(value);
      onVerified();
    } catch (err) {
      setAccessCode("");
      setError(err.message || "The administrator access code could not be verified.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-hy3n-bg p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-hy3n-gold/30 bg-hy3n-surface p-7 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-hy3n-gold/15 text-hy3n-gold"><LockKeyhole size={28} /></div>
        <h1 className="mt-5 text-center text-2xl font-bold text-white">Administrator access code</h1>
        <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">Enter your HY3N administrator code to open the dashboard. Your signed-in administrator account is also required.</p>
        <label htmlFor="hy3n-admin-access-code" className="mt-6 block text-sm font-medium text-white">Access code</label>
        <input id="hy3n-admin-access-code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} type="password" autoComplete="one-time-code" inputMode="numeric" maxLength={64} disabled={submitting} className="mt-2 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none focus:border-hy3n-gold disabled:opacity-60" aria-describedby={error ? "admin-access-code-error" : undefined} />
        {error && <p id="admin-access-code-error" className="mt-3 text-center text-sm text-red-300" role="alert">{error}</p>}
        <button disabled={submitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-hy3n-gold px-4 py-3 font-semibold text-black transition hover:bg-hy3n-gold/90 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
          {submitting ? "Checking…" : "Access dashboard"}
        </button>
      </form>
    </div>
  );
}
