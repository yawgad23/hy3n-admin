import { useEffect, useMemo, useState } from "react";
import { Archive, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { adminApi } from "@/api/adminApi";

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.listAccounts("rider");
      setRiders(result.accounts || []);
    } catch (err) {
      setError(err.message || "Rider accounts could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => riders.filter((rider) => {
    const term = search.trim().toLowerCase();
    const matchText = !term || [rider.fullName, rider.email, rider.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    return matchText && (statusFilter === "all" || rider.accountStatus === statusFilter);
  }), [riders, search, statusFilter]);

  const run = async (key, work) => {
    setBusy(key);
    setError("");
    try {
      await work();
      await load();
    } catch (err) {
      setError(err.message || "The Rider account could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const createRider = async (event) => {
    event.preventDefault();
    await run("create", async () => {
      await adminApi.createAccount({ role: "rider", ...form });
      setForm({ fullName: "", email: "", phone: "", password: "" });
      setShowCreate(false);
    });
  };

  const deactivate = (rider) => {
    if (!window.confirm(`Deactivate ${rider.fullName}? Their login will be disabled immediately. Their profile, ride, wallet, payment, and safety records will remain retained for review.`)) return;
    run(`deactivate-${rider.userId}`, () => adminApi.deactivateAccount(rider.userId, "rider"));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Riders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Register, suspend, restore, or deactivate Rider accounts while retaining records for review.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-hy3n-gold px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-hy3n-gold/90"><Plus size={16} /> Register Rider</button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Rider, phone, or email" className="w-full rounded-xl border border-hy3n-border bg-hy3n-surface py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-hy3n-border bg-hy3n-surface px-3 py-2.5 text-sm text-white outline-none"><option value="all">All accounts</option><option value="active">Active</option><option value="inactive">Inactive (retained)</option><option value="suspended">Suspended</option></select>
      </div>

      {loading ? <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-hy3n-gold/30 border-t-hy3n-gold" /></div> : <div className="overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-hy3n-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Rider</th><th className="px-5 py-3">Contact</th><th className="hidden px-5 py-3 md:table-cell">Rides</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((rider) => <tr key={rider.userId} className="border-b border-hy3n-border/40 last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-hy3n-gold/10 text-hy3n-gold"><UserRound size={15} /></span><div><p className="font-medium text-white">{rider.fullName}</p><p className="mt-0.5 text-xs text-muted-foreground">ID: {rider.userId.slice(-8)}</p></div></div></td><td className="px-5 py-4 text-muted-foreground"><p>{rider.email || "No email"}</p><p className="mt-0.5 text-xs">{rider.phone || "No phone"}</p></td><td className="hidden px-5 py-4 text-white md:table-cell">{rider.totalRides}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${rider.accountStatus === "suspended" ? "border-red-500/30 bg-red-500/10 text-red-300" : rider.accountStatus === "inactive" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{rider.accountStatus}</span></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button disabled={busy === `status-${rider.userId}`} onClick={() => run(`status-${rider.userId}`, () => adminApi.setAccountStatus(rider.userId, "rider", rider.accountStatus === "active" ? "suspended" : "active"))} className="inline-flex items-center gap-1.5 rounded-lg border border-hy3n-border px-3 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50"><ShieldCheck size={13} /> {rider.accountStatus === "active" ? "Suspend" : "Restore"}</button>{rider.accountStatus === "active" && <button disabled={busy === `deactivate-${rider.userId}`} onClick={() => deactivate(rider)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"><Archive size={13} /> Deactivate</button>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={5} className="py-14 text-center text-muted-foreground">No Rider accounts match these filters.</td></tr>}</tbody></table></div></div>}

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={createRider} className="w-full max-w-md rounded-2xl border border-hy3n-border bg-hy3n-surface p-6"><div className="mb-5 flex items-center gap-2"><UserRound className="text-hy3n-gold" size={20} /><h2 className="font-semibold text-white">Register Rider</h2></div><div className="space-y-3">{[["fullName", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["password", "Temporary password (10+ characters)", "password"]].map(([key, label, type]) => <label key={key} className="block text-xs text-muted-foreground">{label}<input required value={form[key]} type={type} minLength={key === "password" ? 10 : undefined} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>)}</div><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-hy3n-border py-2.5 text-sm text-muted-foreground">Cancel</button><button disabled={busy === "create"} className="flex-1 rounded-xl bg-hy3n-gold py-2.5 text-sm font-semibold text-black disabled:opacity-50">{busy === "create" ? "Registering…" : "Register Rider"}</button></div></form></div>}
    </div>
  );
}
