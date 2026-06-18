import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Save, Zap, Info, Clock, Moon, Car, AlertTriangle } from "lucide-react";

const VEHICLE_TYPES = ["Sedan", "SUV", "Tricycle", "Motorcycle", "Minivan"];
const ICONS = { Sedan: "🚗", SUV: "🚙", Tricycle: "🛺", Motorcycle: "🏍️", Minivan: "🚐" };

const DEFAULTS = {
  Sedan:      { base_fare: 5,  per_km_rate: 2.5, surge_multiplier: 1, minimum_fare: 8,  peak_multiplier: 1.3, peak_start_hour: 7, peak_end_hour: 9, peak_start_hour_2: 17, peak_end_hour_2: 19, night_multiplier: 1.2, night_start_hour: 22, night_end_hour: 5, traffic_multiplier: 1.5, traffic_enabled: false, is_active: true },
  SUV:        { base_fare: 8,  per_km_rate: 3.5, surge_multiplier: 1, minimum_fare: 12, peak_multiplier: 1.3, peak_start_hour: 7, peak_end_hour: 9, peak_start_hour_2: 17, peak_end_hour_2: 19, night_multiplier: 1.2, night_start_hour: 22, night_end_hour: 5, traffic_multiplier: 1.5, traffic_enabled: false, is_active: true },
  Tricycle:   { base_fare: 3,  per_km_rate: 1.5, surge_multiplier: 1, minimum_fare: 5,  peak_multiplier: 1.2, peak_start_hour: 7, peak_end_hour: 9, peak_start_hour_2: 17, peak_end_hour_2: 19, night_multiplier: 1.1, night_start_hour: 22, night_end_hour: 5, traffic_multiplier: 1.3, traffic_enabled: false, is_active: true },
  Motorcycle: { base_fare: 2,  per_km_rate: 1.2, surge_multiplier: 1, minimum_fare: 4,  peak_multiplier: 1.2, peak_start_hour: 7, peak_end_hour: 9, peak_start_hour_2: 17, peak_end_hour_2: 19, night_multiplier: 1.1, night_start_hour: 22, night_end_hour: 5, traffic_multiplier: 1.2, traffic_enabled: false, is_active: true },
  Minivan:    { base_fare: 10, per_km_rate: 4.0, surge_multiplier: 1, minimum_fare: 15, peak_multiplier: 1.3, peak_start_hour: 7, peak_end_hour: 9, peak_start_hour_2: 17, peak_end_hour_2: 19, night_multiplier: 1.2, night_start_hour: 22, night_end_hour: 5, traffic_multiplier: 1.5, traffic_enabled: false, is_active: true },
};

export function calcDynamicFare(cfg, km = 5, previewCondition = null) {
  if (!cfg || !km) return null;
  const now = new Date();
  const hour = previewCondition ? -1 : now.getHours();

  const inRange = (h, start, end) =>
    start <= end ? h >= start && h < end : h >= start || h < end;

  const isPeak = previewCondition === "peak" ||
    (previewCondition == null && (
      inRange(hour, cfg.peak_start_hour ?? 7, cfg.peak_end_hour ?? 9) ||
      inRange(hour, cfg.peak_start_hour_2 ?? 17, cfg.peak_end_hour_2 ?? 19)
    ));

  const isNight = previewCondition === "night" ||
    (previewCondition == null && inRange(hour, cfg.night_start_hour ?? 22, cfg.night_end_hour ?? 5));

  const isTraffic = previewCondition === "traffic" ||
    (previewCondition == null && cfg.traffic_enabled);

  let dynamicMultiplier = cfg.surge_multiplier ?? 1;
  if (isPeak)    dynamicMultiplier = Math.max(dynamicMultiplier, cfg.peak_multiplier ?? 1);
  if (isNight)   dynamicMultiplier = Math.max(dynamicMultiplier, cfg.night_multiplier ?? 1);
  if (isTraffic) dynamicMultiplier = Math.max(dynamicMultiplier, cfg.traffic_multiplier ?? 1);

  const base = (cfg.base_fare + cfg.per_km_rate * Number(km)) * dynamicMultiplier;
  return Math.max(base, cfg.minimum_fare ?? 0).toFixed(2);
}

function NumberInput({ label, value, onChange, step = "0.1", min = "0" }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input type="number" step={step} min={min} value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${value ? "bg-hy3n-green" : "bg-hy3n-border"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </div>
  );
}

export default function Pricing() {
  const [configs, setConfigs] = useState({});
  const [ids, setIds] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState("normal"); // normal | peak | night | traffic

  useEffect(() => {
    firebaseClient.entities.FareConfig.list().then(data => {
      const map = {}, idMap = {};
      data.forEach(c => { map[c.vehicle_type] = { ...DEFAULTS[c.vehicle_type], ...c }; idMap[c.vehicle_type] = c.id; });
      VEHICLE_TYPES.forEach(vt => { if (!map[vt]) map[vt] = { ...DEFAULTS[vt] }; });
      setConfigs(map);
      setIds(idMap);
      setLoading(false);
    });
  }, []);

  const update = (vt, field, value) => setConfigs(p => ({ ...p, [vt]: { ...p[vt], [field]: value } }));

  const saveConfig = async (vt) => {
    setSaving(p => ({ ...p, [vt]: true }));
    const c = configs[vt];
    const data = {
      vehicle_type: vt,
      base_fare: Number(c.base_fare), per_km_rate: Number(c.per_km_rate),
      surge_multiplier: Number(c.surge_multiplier), minimum_fare: Number(c.minimum_fare),
      peak_multiplier: Number(c.peak_multiplier), peak_start_hour: Number(c.peak_start_hour),
      peak_end_hour: Number(c.peak_end_hour), peak_start_hour_2: Number(c.peak_start_hour_2),
      peak_end_hour_2: Number(c.peak_end_hour_2), night_multiplier: Number(c.night_multiplier),
      night_start_hour: Number(c.night_start_hour), night_end_hour: Number(c.night_end_hour),
      traffic_multiplier: Number(c.traffic_multiplier), traffic_enabled: !!c.traffic_enabled,
      is_active: !!c.is_active,
    };
    if (ids[vt]) await firebaseClient.entities.FareConfig.update(ids[vt], data);
    else { const r = await firebaseClient.entities.FareConfig.create(data); setIds(p => ({ ...p, [vt]: r.id })); }
    setSaving(p => ({ ...p, [vt]: false }));
    setSaved(p => ({ ...p, [vt]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [vt]: false })), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  const previewCondition = preview === "normal" ? null : preview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dynamic Pricing Engine</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure base fares, per-km rates, and condition-based surge multipliers per vehicle type</p>
      </div>

      {/* Formula */}
      <div className="bg-hy3n-gold/5 border border-hy3n-gold/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info size={16} className="text-hy3n-gold mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="text-white font-semibold">Dynamic Fare Formula</p>
          <p className="text-muted-foreground font-mono text-xs">Fare = max( (BaseFare + PerKmRate × Distance) × EffectiveMultiplier, MinFare )</p>
          <p className="text-muted-foreground text-xs">EffectiveMultiplier = highest of: Manual Surge, Peak Hours, Night Rate, Traffic — applied automatically</p>
        </div>
      </div>

      {/* Preview mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Preview condition:</span>
        {[
          { key: "normal", label: "Normal", icon: Car },
          { key: "peak", label: "Peak Hours", icon: Clock },
          { key: "night", label: "Night Rate", icon: Moon },
          { key: "traffic", label: "Traffic Surge", icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setPreview(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
              preview === key ? "bg-hy3n-gold text-black border-hy3n-gold" : "border-hy3n-border text-muted-foreground hover:text-white"
            }`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {VEHICLE_TYPES.map(vt => {
          const cfg = configs[vt] || DEFAULTS[vt];
          const isSurge = cfg.surge_multiplier > 1;
          const normalFare = calcDynamicFare(cfg, 5, null);
          const previewFare = calcDynamicFare(cfg, 5, previewCondition);
          return (
            <div key={vt} className={`bg-hy3n-surface border rounded-2xl overflow-hidden transition-colors ${isSurge || cfg.traffic_enabled ? "border-hy3n-gold/50" : "border-hy3n-border"}`}>
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-hy3n-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ICONS[vt]}</span>
                    <div>
                      <h3 className="text-white font-bold">{vt}</h3>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {isSurge && <span className="text-xs text-hy3n-gold flex items-center gap-0.5"><Zap size={9} /> Surge</span>}
                        {cfg.traffic_enabled && <span className="text-xs text-orange-400 flex items-center gap-0.5"><AlertTriangle size={9} /> Traffic</span>}
                        {cfg.peak_multiplier > 1 && <span className="text-xs text-blue-400 flex items-center gap-0.5"><Clock size={9} /> Peak</span>}
                        {cfg.night_multiplier > 1 && <span className="text-xs text-purple-400 flex items-center gap-0.5"><Moon size={9} /> Night</span>}
                      </div>
                    </div>
                  </div>
                  <Toggle label="Active" value={cfg.is_active} onChange={v => update(vt, "is_active", v)} />
                </div>

                {/* Fare preview */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                    <p className="text-xs text-muted-foreground">5km base fare</p>
                    <p className="text-white font-bold text-sm">GHS {normalFare}</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${previewCondition ? "bg-hy3n-gold/10 border border-hy3n-gold/20" : "bg-white/5"}`}>
                    <p className="text-xs text-muted-foreground">{preview === "normal" ? "Live estimate" : `${preview} fare`}</p>
                    <p className={`font-bold text-sm ${previewCondition ? "text-hy3n-gold" : "text-white"}`}>GHS {previewFare}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Base rates */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Base Rates</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Base Fare (GHS)" value={cfg.base_fare} onChange={v => update(vt, "base_fare", v)} step="0.5" />
                    <NumberInput label="Per KM Rate (GHS)" value={cfg.per_km_rate} onChange={v => update(vt, "per_km_rate", v)} />
                    <NumberInput label="Minimum Fare (GHS)" value={cfg.minimum_fare} onChange={v => update(vt, "minimum_fare", v)} step="0.5" />
                    <NumberInput label="Manual Surge ×" value={cfg.surge_multiplier} onChange={v => update(vt, "surge_multiplier", v)} min="1" />
                  </div>
                </div>

                {/* Peak hours */}
                <div className="border-t border-hy3n-border pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={12} className="text-blue-400" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Peak Hours</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Multiplier ×" value={cfg.peak_multiplier} onChange={v => update(vt, "peak_multiplier", v)} min="1" />
                    <div className="col-span-2 grid grid-cols-4 gap-2">
                      <NumberInput label="AM Start" value={cfg.peak_start_hour} onChange={v => update(vt, "peak_start_hour", v)} step="1" min="0" />
                      <NumberInput label="AM End" value={cfg.peak_end_hour} onChange={v => update(vt, "peak_end_hour", v)} step="1" min="0" />
                      <NumberInput label="PM Start" value={cfg.peak_start_hour_2} onChange={v => update(vt, "peak_start_hour_2", v)} step="1" min="0" />
                      <NumberInput label="PM End" value={cfg.peak_end_hour_2} onChange={v => update(vt, "peak_end_hour_2", v)} step="1" min="0" />
                    </div>
                  </div>
                </div>

                {/* Night rate */}
                <div className="border-t border-hy3n-border pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Moon size={12} className="text-purple-400" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Night Rate</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberInput label="Multiplier ×" value={cfg.night_multiplier} onChange={v => update(vt, "night_multiplier", v)} min="1" />
                    <NumberInput label="Start Hour" value={cfg.night_start_hour} onChange={v => update(vt, "night_start_hour", v)} step="1" min="0" />
                    <NumberInput label="End Hour" value={cfg.night_end_hour} onChange={v => update(vt, "night_end_hour", v)} step="1" min="0" />
                  </div>
                </div>

                {/* Traffic surge */}
                <div className="border-t border-hy3n-border pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={12} className="text-orange-400" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Traffic Surge</p>
                  </div>
                  <div className="space-y-2">
                    <Toggle label="Enable traffic surge now" value={cfg.traffic_enabled} onChange={v => update(vt, "traffic_enabled", v)} />
                    <NumberInput label="Traffic Multiplier ×" value={cfg.traffic_multiplier} onChange={v => update(vt, "traffic_multiplier", v)} min="1" />
                  </div>
                </div>

                <button onClick={() => saveConfig(vt)} disabled={saving[vt]}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                    saved[vt] ? "bg-hy3n-green/20 text-hy3n-green border border-hy3n-green/30" : "bg-hy3n-gold hover:bg-hy3n-gold/90 text-black"
                  }`}>
                  <Save size={15} />
                  {saving[vt] ? "Saving…" : saved[vt] ? "Saved ✓" : "Save Configuration"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}