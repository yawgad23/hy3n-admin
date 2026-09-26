import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { adminApi } from "@/api/adminApi";

const serviceTypes = ["car", "okada", "delivery"];

function statusStyle(status) {
  return status === "suspended"
    ? "text-red-300 bg-red-500/10 border-red-500/30"
    : "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
}

function documentItems(driver) {
  const documents = driver.documents || {};
  return [
    ["Profile photo", documents.profilePhoto],
    ["Ghana Card — front", documents.ghanaCardFront],
    ["Ghana Card — back", documents.ghanaCardBack],
    ["Driver’s licence — front", documents.driverLicenseFront],
    ["Driver’s licence — back", documents.driverLicenseBack],
    ["Vehicle photo", documents.vehiclePhoto],
    ["Vehicle registration", documents.vehicleRegistration],
    ["Insurance", documents.insurance],
    ["Roadworthy certificate", documents.roadworthy],
  ].filter(([, url]) => Boolean(url));
}

function DocumentReview({ driver, onClose, onApprove, onReject, busy }) {
  const documents = documentItems(driver);
  const approved = driver.approvalStatus === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hy3n-border bg-hy3n-surface shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hy3n-border bg-hy3n-surface px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-hy3n-gold">Driver verification</p>
            <h2 className="mt-1 text-lg font-bold text-white">{driver.fullName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Review identity, licence, vehicle, and insurance before approval.</p>
          </div>
          <button onClick={onClose} aria-label="Close verification review" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-muted-foreground">Service</p><p className="mt-1 capitalize text-white">{driver.serviceType}</p></div>
            <div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-muted-foreground">Vehicle</p><p className="mt-1 break-words text-white">{driver.vehicle || "Not recorded"}</p></div>
            <div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-muted-foreground">Plate</p><p className="mt-1 text-white">{driver.plate || "Not recorded"}</p></div>
            <div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-muted-foreground">Contact</p><p className="mt-1 break-all text-white">{driver.phone || driver.email || "Not recorded"}</p></div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-hy3n-gold" /><h3 className="font-semibold text-white">Submitted documents</h3></div>
            {documents.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {documents.map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-hy3n-border bg-hy3n-bg p-3 text-sm text-white transition hover:border-hy3n-gold/60 hover:bg-white/5">
                    <span>{label}</span><ExternalLink size={15} className="shrink-0 text-hy3n-gold" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                No uploaded verification documents are available for this Driver. Do not approve until the Driver submits their required documents.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-hy3n-border pt-5">
            {driver.phone && <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-hy3n-border px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5">Call Driver</a>}
            {!approved && <button disabled={busy || !documents.length} onClick={onApprove} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={16} /> {busy ? "Saving…" : "Approve Driver"}</button>}
            {!approved && <button disabled={busy} onClick={onReject} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"><UserRoundX size={16} /> Reject</button>}
            {approved && <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300"><BadgeCheck size={18} /> Approved Driver</span>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", password: "", serviceType: "car", vehicleMake: "", vehicleModel: "", licensePlate: "",
  });

  const load = async () => {
    setLoading(true); setError("");
    try { const result = await adminApi.listAccounts("driver"); setDrivers(result.accounts || []); }
    catch (err) { setError(err.message || "Drivers could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => drivers.filter((driver) => {
    const term = search.trim().toLowerCase();
    const matchText = !term || [driver.fullName, driver.email, driver.phone, driver.vehicle, driver.plate, driver.serviceType]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    const matchStatus = statusFilter === "all" || driver.accountStatus === statusFilter || driver.approvalStatus === statusFilter;
    return matchText && matchStatus;
  }), [drivers, search, statusFilter]);

  const run = async (key, work) => {
    setBusy(key); setError("");
    try { await work(); await load(); }
    catch (err) { setError(err.message || "The Driver account could not be updated."); }
    finally { setBusy(""); }
  };

  const approve = (driver) => {
    if (!window.confirm(`Approve ${driver.fullName}? Confirm that the identity, licence, vehicle, insurance, and roadworthy documents have been reviewed.`)) return;
    run(`approve-${driver.userId}`, async () => { await adminApi.setDriverApproval(driver.userId, "approved"); setReviewing(null); });
  };
  const reject = (driver) => {
    const reason = window.prompt("Reason for rejecting this Driver application:", "");
    if (reason === null) return;
    run(`reject-${driver.userId}`, async () => { await adminApi.setDriverApproval(driver.userId, "rejected", reason); setReviewing(null); });
  };
  const createDriver = async (event) => {
    event.preventDefault();
    await run("create", async () => {
      await adminApi.createAccount({ role: "driver", ...form });
      setForm({ fullName: "", email: "", phone: "", password: "", serviceType: "car", vehicleMake: "", vehicleModel: "", licensePlate: "" });
      setShowCreate(false);
    });
  };
  const remove = (driver) => {
    if (!window.confirm(`Remove ${driver.fullName}? Their login and Driver profile will be removed. Ride and payment records stay for audit.`)) return;
    run(`remove-${driver.userId}`, () => adminApi.removeAccount(driver.userId, "driver"));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-white">Drivers</h1><p className="mt-0.5 text-sm text-muted-foreground">Verify documents, then approve, suspend, or remove Driver accounts.</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-hy3n-gold px-4 py-2.5 text-sm font-semibold text-black hover:bg-hy3n-gold/90"><Plus size={16} /> Register Driver</button></div>
      <div className="rounded-2xl border border-hy3n-green/30 bg-hy3n-green/10 p-4 text-sm text-muted-foreground"><span className="font-semibold text-hy3n-green">Verification safeguard:</span> new Drivers remain <span className="text-white">pending</span> and offline until an administrator reviews their submitted documents and approves them.</div>
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Driver, phone, vehicle, plate, or type" className="w-full rounded-xl border border-hy3n-border bg-hy3n-surface py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-hy3n-border bg-hy3n-surface px-3 py-2.5 text-sm text-white outline-none"><option value="all">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending verification</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      {loading ? <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-hy3n-gold/30 border-t-hy3n-gold" /></div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((driver) => { const documents = documentItems(driver); return <article key={driver.userId} className="rounded-2xl border border-hy3n-border bg-hy3n-surface p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-white">{driver.fullName}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{driver.email || driver.phone || "No contact details"}</p></div><div className="flex gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(driver.accountStatus)}`}>{driver.accountStatus}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${driver.approvalStatus === "approved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>{driver.approvalStatus || "pending"}</span></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Driver type</p><p className="mt-1 capitalize text-white">{driver.serviceType}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Vehicle</p><p className="mt-1 truncate text-white">{driver.vehicle || "Not recorded"}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Plate</p><p className="mt-1 text-white">{driver.plate || "Not recorded"}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Verification files</p><p className="mt-1 text-white">{documents.length} submitted</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setReviewing(driver)} className="inline-flex items-center gap-1.5 rounded-lg border border-hy3n-gold/40 bg-hy3n-gold/10 px-3 py-2 text-xs font-medium text-hy3n-gold hover:bg-hy3n-gold/20"><FileText size={13} /> Review documents</button>{driver.phone && <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-hy3n-border px-3 py-2 text-xs text-white hover:bg-white/5">Call</a>}<button disabled={busy === `status-${driver.userId}`} onClick={() => run(`status-${driver.userId}`, () => adminApi.setAccountStatus(driver.userId, "driver", driver.accountStatus === "suspended" ? "active" : "suspended"))} className="inline-flex items-center gap-1.5 rounded-lg border border-hy3n-border px-3 py-2 text-xs font-medium text-white hover:bg-white/5 disabled:opacity-50"><ShieldCheck size={13} /> {driver.accountStatus === "suspended" ? "Restore" : "Suspend"}</button><button disabled={busy === `remove-${driver.userId}`} onClick={() => remove(driver)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"><Trash2 size={13} /> Remove</button></div></article>; })}{!filtered.length && <div className="col-span-full rounded-2xl border border-hy3n-border bg-hy3n-surface py-14 text-center text-sm text-muted-foreground">No Driver accounts match these filters.</div>}</div>}
      {reviewing && <DocumentReview driver={reviewing} busy={busy === `approve-${reviewing.userId}` || busy === `reject-${reviewing.userId}`} onClose={() => setReviewing(null)} onApprove={() => approve(reviewing)} onReject={() => reject(reviewing)} />}
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={createDriver} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-hy3n-border bg-hy3n-surface p-6"><div className="mb-5 flex items-center gap-2"><Car className="text-hy3n-gold" size={20} /><h2 className="font-semibold text-white">Register Driver</h2></div><p className="mb-4 text-xs text-muted-foreground">The account starts pending and offline. Ask the Driver to submit their documents before approving them.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["fullName", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["password", "Temporary password (10+ characters)", "password"], ["vehicleMake", "Vehicle make", "text"], ["vehicleModel", "Vehicle model", "text"], ["licensePlate", "Plate number", "text"]].map(([key, label, type]) => <label key={key} className="text-xs text-muted-foreground">{label}<input required value={form[key]} type={type} minLength={key === "password" ? 10 : undefined} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none focus:border-hy3n-gold/60" /></label>)}<label className="text-xs text-muted-foreground">Driver type<select value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2.5 text-sm text-white outline-none">{serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label></div><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-hy3n-border py-2.5 text-sm text-muted-foreground">Cancel</button><button disabled={busy === "create"} className="flex-1 rounded-xl bg-hy3n-gold py-2.5 text-sm font-semibold text-black disabled:opacity-50">{busy === "create" ? "Registering…" : "Register pending Driver"}</button></div></form></div>}
    </div>
  );
}
