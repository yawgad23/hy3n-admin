import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, RefreshCw, Save, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { adminApi } from "@/api/adminApi";

const labels = { car: "Car drivers", okada: "Okada drivers", delivery: "Delivery drivers" };

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({ administrator: null, platformFees: [] });
  const [fees, setFees] = useState({ car: "", okada: "", delivery: "" });
  const [administrators, setAdministrators] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "" });

  const load = async () => {
    setLoading(true); setMessage("");
    try {
      const result = await adminApi.settings();
      setSettings(result);
      setFees(Object.fromEntries((result.platformFees || []).map((fee) => [fee.serviceType, String(fee.amount)])));
      if (result.administrator?.canManageAccess) {
        const access = await adminApi.listAdministratorAccess();
        setAdministrators(access.administrators || []);
      } else setAdministrators([]);
    } catch (err) { setMessage(err.message || "Settings could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveFee = async (serviceType) => {
    setSaving(`fee-${serviceType}`); setMessage("");
    try {
      const result = await adminApi.updatePlatformFee(serviceType, Number(fees[serviceType]));
      setSettings((current) => ({ ...current, platformFees: (current.platformFees || []).map((fee) => fee.serviceType === serviceType ? result.fee : fee) }));
      setFees((current) => ({ ...current, [serviceType]: String(result.fee.amount) }));
      setMessage(`${labels[serviceType]} daily fee saved. New Hubtel charges use the new amount immediately.`);
    } catch (err) { setMessage(err.message || "The fee could not be saved."); }
    finally { setSaving(""); }
  };

  const saveAdministrator = async (event) => {
    event.preventDefault(); setSaving("admin"); setMessage("");
    try {
      await adminApi.updateAdministratorAccess(newAdmin.email, { name: newAdmin.name, isActive: true });
      setNewAdmin({ email: "", name: "" });
      const access = await adminApi.listAdministratorAccess(); setAdministrators(access.administrators || []);
      setMessage("Administrator access saved.");
    } catch (err) { setMessage(err.message || "Administrator access could not be saved."); }
    finally { setSaving(""); }
  };

  const toggleAdministrator = async (admin) => {
    if (admin.role === "owner") return;
    const nextState = !admin.isActive;
    if (!window.confirm(`${nextState ? "Restore" : "Revoke"} administrator access for ${admin.email}?`)) return;
    setSaving(`access-${admin.email}`); setMessage("");
    try {
      await adminApi.updateAdministratorAccess(admin.email, { name: admin.name, isActive: nextState });
      const access = await adminApi.listAdministratorAccess(); setAdministrators(access.administrators || []);
      setMessage(`Administrator access ${nextState ? "restored" : "revoked"}.`);
    } catch (err) { setMessage(err.message || "Administrator access could not be updated."); }
    finally { setSaving(""); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-hy3n-gold" /></div>;
  const owner = settings.administrator?.canManageAccess === true;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Secure platform controls and administrator access.</p></div><button onClick={load} className="inline-flex items-center gap-2 self-start rounded-xl border border-hy3n-border px-3 py-2 text-sm text-white hover:bg-white/5"><RefreshCw size={15} /> Refresh</button></div>
      {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.includes("could not") || message.includes("not be") ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>{message}</div>}
      <section className="rounded-2xl border border-hy3n-green/30 bg-hy3n-green/10 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-hy3n-green" size={20} /><div><h2 className="font-semibold text-white">Administrator session verified</h2><p className="mt-1 text-sm text-muted-foreground">Settings are saved through the protected HY3N API. The dashboard does not use a browser PIN, master code, or public access list.</p></div></div></section>
      <section className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-6"><h2 className="text-lg font-semibold text-white">Daily Driver platform fee</h2><p className="mt-1 text-sm text-muted-foreground">These values are used for new Hubtel fee prompts immediately. Existing charges are unchanged.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{["car", "okada", "delivery"].map((serviceType) => <div key={serviceType} className="rounded-xl border border-hy3n-border bg-hy3n-bg p-4"><p className="font-medium text-white">{labels[serviceType]}</p><label className="mt-3 block text-xs text-muted-foreground">Daily fee (GH₵)<input aria-label={`${labels[serviceType]} daily fee`} type="number" min="0.01" max="1000" step="0.01" value={fees[serviceType] || ""} onChange={(event) => setFees((current) => ({ ...current, [serviceType]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-hy3n-border bg-hy3n-surface px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/70" /></label><button disabled={saving === `fee-${serviceType}`} onClick={() => saveFee(serviceType)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-hy3n-gold px-3 py-2.5 text-sm font-semibold text-black hover:bg-hy3n-gold/90 disabled:opacity-50"><Save size={14} /> {saving === `fee-${serviceType}` ? "Saving…" : "Save fee"}</button></div>)}</div></section>
      {owner && <section className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-6"><div className="flex items-center gap-3"><KeyRound className="text-hy3n-gold" size={20} /><div><h2 className="text-lg font-semibold text-white">Administrator access</h2><p className="mt-1 text-sm text-muted-foreground">Grant or revoke dashboard access. An administrator must still sign in with their own Firebase account.</p></div></div><form onSubmit={saveAdministrator} className="mt-5 grid gap-3 rounded-xl border border-hy3n-border bg-hy3n-bg p-4 md:grid-cols-[1fr_1fr_auto]"><input type="email" required value={newAdmin.email} onChange={(event) => setNewAdmin((current) => ({ ...current, email: event.target.value }))} placeholder="Administrator email" className="rounded-lg border border-hy3n-border bg-hy3n-surface px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/70" /><input value={newAdmin.name} onChange={(event) => setNewAdmin((current) => ({ ...current, name: event.target.value }))} placeholder="Display name (optional)" className="rounded-lg border border-hy3n-border bg-hy3n-surface px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/70" /><button disabled={saving === "admin"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-hy3n-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><UserPlus size={15} /> Add admin</button></form><div className="mt-4 divide-y divide-hy3n-border/60 rounded-xl border border-hy3n-border">{administrators.map((admin) => <div key={admin.email} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{admin.name || admin.email}</p><p className="truncate text-xs text-muted-foreground">{admin.email} · {admin.role}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${admin.isActive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{admin.isActive ? "Active" : "Revoked"}</span>{admin.role !== "owner" && <button disabled={saving === `access-${admin.email}`} onClick={() => toggleAdministrator(admin)} className="inline-flex items-center gap-1.5 rounded-lg border border-hy3n-border px-3 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50"><UserX size={13} /> {admin.isActive ? "Revoke" : "Restore"}</button>}</div>)}</div></section>}
      {!owner && <section className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-5 text-sm text-muted-foreground">Only the HY3N account owner can add or revoke other administrator accounts. You can still manage the live daily platform fees.</section>}
    </div>
  );
}
