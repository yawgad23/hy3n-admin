import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bike, Car, CheckCircle2, Info, Package, Save, Settings2 } from "lucide-react";
import { adminApi } from "@/api/adminApi";

const CATEGORIES = [
  { id: "standard", label: "Standard", icon: Car },
  { id: "comfort", label: "Comfort", icon: Car },
  { id: "kantanka", label: "Kantanka", icon: Car },
  { id: "executive", label: "Executive", icon: Car },
  { id: "okada", label: "Okada", icon: Bike },
  { id: "express_delivery", label: "Express Delivery", icon: Package },
];

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundGhsFare(value) {
  const safe = Math.max(0, asNumber(value));
  const whole = Math.floor(safe);
  return whole + (safe - whole > 0.5 ? 1 : 0);
}

function previewFare(rate, distanceKm = 5, durationMinutes = 15) {
  const raw = asNumber(rate.baseFare) + asNumber(rate.pricePerKm) * distanceKm + asNumber(rate.pricePerMinute) * durationMinutes;
  return roundGhsFare(Math.max(raw, asNumber(rate.minFare)) + asNumber(rate.bookingFee));
}

/** Compatibility preview for the internal ride form; final prices always come from the API. */
export function calcDynamicFare(config, distanceKm = 5) {
  const rate = {
    baseFare: config?.baseFare ?? config?.base_fare,
    pricePerKm: config?.pricePerKm ?? config?.per_km_rate,
    pricePerMinute: config?.pricePerMinute ?? config?.per_minute_rate ?? 0,
    minFare: config?.minFare ?? config?.minimum_fare,
    bookingFee: config?.bookingFee ?? config?.booking_fee ?? 0,
  };
  return previewFare(rate, distanceKm, 0).toFixed(2);
}

function Field({ label, value, onChange, step = "0.01", min = "0" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-hy3n-border bg-hy3n-bg px-3 py-2 text-sm text-white outline-none transition focus:border-hy3n-gold/70 focus:ring-2 focus:ring-hy3n-gold/15"
      />
    </label>
  );
}

export default function Pricing() {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [error, setError] = useState("");

  const loadRates = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.fareRates();
      const byCategory = Object.fromEntries((response.fareRates || []).map((rate) => [rate.category, rate]));
      setRates(byCategory);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pricing could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRates(); }, []);

  const totals = useMemo(() => Object.fromEntries(
    CATEGORIES.map(({ id }) => [id, previewFare(rates[id] || {})]),
  ), [rates]);

  const update = (category, field, value) => {
    setRates((previous) => ({
      ...previous,
      [category]: { ...previous[category], [field]: value },
    }));
  };

  const save = async (category) => {
    const rate = rates[category];
    if (!rate) return;
    setSaving((previous) => ({ ...previous, [category]: true }));
    setError("");
    try {
      const response = await adminApi.updateFareRate(category, {
        baseFare: asNumber(rate.baseFare),
        pricePerKm: asNumber(rate.pricePerKm),
        pricePerMinute: asNumber(rate.pricePerMinute),
        minFare: asNumber(rate.minFare),
        bookingFee: asNumber(rate.bookingFee),
        waitingFeePerMinute: asNumber(rate.waitingFeePerMinute),
        isActive: rate.isActive !== false,
      });
      setRates((previous) => ({ ...previous, [category]: response.fareRate }));
      setSaved((previous) => ({ ...previous, [category]: true }));
      window.setTimeout(() => setSaved((previous) => ({ ...previous, [category]: false })), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pricing could not be saved.");
    } finally {
      setSaving((previous) => ({ ...previous, [category]: false }));
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-hy3n-gold/20 border-t-hy3n-gold" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Category pricing</h1>
          <p className="mt-1 text-sm text-muted-foreground">One protected, server-authoritative fare model for every HY3N ride category.</p>
        </div>
        <button onClick={loadRates} className="flex items-center gap-2 rounded-xl border border-hy3n-border px-3 py-2 text-sm text-muted-foreground transition hover:border-hy3n-gold/50 hover:text-white">
          <Settings2 size={15} /> Refresh rates
        </button>
      </header>

      <section className="rounded-2xl border border-hy3n-gold/25 bg-hy3n-gold/5 p-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 shrink-0 text-hy3n-gold" size={18} />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-white">Server fare formula</p>
            <p className="font-mono text-xs text-muted-foreground">Final fare = round( max(Base + Per km × distance + Per min × trip time, minimum) × approved surge + booking fee + paid waiting )</p>
            <p className="text-xs text-muted-foreground">Paid waiting starts after 3 complimentary minutes at pickup, is measured from server arrival/start timestamps, and uses the confirmed ride's rate snapshot.</p>
          </div>
        </div>
      </section>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</div>}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const rate = rates[id];
          if (!rate) return null;
          const inactive = rate.isActive === false;
          return (
            <article key={id} className={`overflow-hidden rounded-2xl border bg-hy3n-surface ${inactive ? "border-red-500/35" : "border-hy3n-border"}`}>
              <div className="border-b border-hy3n-border px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-hy3n-gold/10 text-hy3n-gold"><Icon size={20} /></span>
                    <div><h2 className="font-bold text-white">{label}</h2><p className="text-xs text-muted-foreground">{inactive ? "Unavailable to Riders" : "Available for new quotes"}</p></div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={!inactive} onChange={(event) => update(id, "isActive", event.target.checked)} className="accent-[#d4af37]" />Active</label>
                </div>
                <div className="mt-4 flex items-end justify-between rounded-xl bg-white/5 px-3 py-2.5">
                  <div><p className="text-xs text-muted-foreground">Example • 5 km / 15 min</p><p className="mt-0.5 text-lg font-bold text-white">GH₵ {totals[id]}</p></div>
                  <span className="text-right text-xs text-muted-foreground">Before any approved<br />high-demand surcharge</span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Base fare (GHS)" value={rate.baseFare} onChange={(value) => update(id, "baseFare", value)} step="0.5" />
                  <Field label="Minimum fare (GHS)" value={rate.minFare} onChange={(value) => update(id, "minFare", value)} step="0.5" />
                  <Field label="Per km (GHS)" value={rate.pricePerKm} onChange={(value) => update(id, "pricePerKm", value)} />
                  <Field label="Per minute (GHS)" value={rate.pricePerMinute} onChange={(value) => update(id, "pricePerMinute", value)} />
                  <div className="col-span-2"><Field label="Booking fee (GHS)" value={rate.bookingFee} onChange={(value) => update(id, "bookingFee", value)} step="0.5" /></div>
                  <div className="col-span-2"><Field label="Waiting fee / minute after 3 free minutes (GHS)" value={rate.waitingFeePerMinute} onChange={(value) => update(id, "waitingFeePerMinute", value)} /></div>
                </div>
                <button onClick={() => save(id)} disabled={saving[id]} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60 ${saved[id] ? "border border-hy3n-green/30 bg-hy3n-green/15 text-hy3n-green" : "bg-hy3n-gold text-black hover:bg-hy3n-gold/90"}`}>
                  {saved[id] ? <CheckCircle2 size={16} /> : <Save size={16} />}{saving[id] ? "Saving…" : saved[id] ? "Saved" : "Save category pricing"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
