import { useState, useEffect } from "react";
import { calcDynamicFare } from "../pages/Pricing";
import { firebaseClient } from "@/api/firebaseClient";
import { X } from "lucide-react";

export default function RideForm({ ride, onClose, onSaved }) {
  const [form, setForm] = useState({
    rider_name: ride?.rider_name || "",
    rider_phone: ride?.rider_phone || "",
    driver_name: ride?.driver_name || "",
    pickup_location: ride?.pickup_location || "",
    dropoff_location: ride?.dropoff_location || "",
    status: ride?.status || "requested",
    fare: ride?.fare || "",
    distance_km: ride?.distance_km || "",
    duration_min: ride?.duration_min || "",
    vehicle_type: ride?.vehicle_type || "Sedan",
    payment_method: ride?.payment_method || "Cash",
    city: ride?.city || "",
    rating: ride?.rating || "",
  });
  const [saving, setSaving] = useState(false);
  const [fareConfigs, setFareConfigs] = useState({});

  useEffect(() => {
    firebaseClient.entities.FareConfig.list().then(data => {
      const map = {};
      data.forEach(c => { map[c.vehicle_type] = c; });
      setFareConfigs(map);
    });
  }, []);

  const calcEstimatedFare = (vehicleType, distanceKm) => {
    const cfg = fareConfigs[vehicleType];
    if (!cfg || !distanceKm) return "";
    return calcDynamicFare(cfg, distanceKm) || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    ["fare","distance_km","duration_min","rating"].forEach(k => { if (data[k]) data[k] = Number(data[k]); });
    if (ride?.id) {
      await firebaseClient.entities.Ride.update(ride.id, data);
    } else {
      await firebaseClient.entities.Ride.create(data);
    }
    onSaved();
  };

  const textFields = [
    { key: "rider_name", label: "Rider Name", required: true },
    { key: "rider_phone", label: "Rider Phone" },
    { key: "driver_name", label: "Driver Name" },
    { key: "pickup_location", label: "Pickup Location", wide: true },
    { key: "dropoff_location", label: "Dropoff Location", wide: true },
    { key: "city", label: "City" },
    { key: "distance_km", label: "Distance (km)", number: true },
    { key: "duration_min", label: "Duration (min)", number: true },
    { key: "rating", label: "Rating (1-5)", number: true },
  ];

  const est = calcEstimatedFare(form.vehicle_type, form.distance_km);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border">
          <h2 className="font-semibold text-white">{ride ? "Edit Ride" : "Add Ride"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {textFields.map(f => (
              <div key={f.key} className={f.wide ? "col-span-2" : ""}>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{f.label}</label>
                <input
                  type={f.number ? "number" : "text"}
                  value={form[f.key]}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(p => {
                      const next = { ...p, [f.key]: val };
                      // Auto-fill fare when distance changes
                      if (f.key === "distance_km") {
                        const newEst = calcEstimatedFare(p.vehicle_type, val);
                        if (newEst) next.fare = newEst;
                      }
                      return next;
                    });
                  }}
                  required={f.required}
                  className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60"
                />
              </div>
            ))}

            {/* Vehicle Type */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => {
                const vt = e.target.value;
                const newEst = calcEstimatedFare(vt, form.distance_km);
                setForm(p => ({ ...p, vehicle_type: vt, fare: newEst || p.fare }));
              }}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                {["Sedan","SUV","Tricycle","Motorcycle","Minivan"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Fare with auto-calc */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Fare (GHS)</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.fare}
                  onChange={e => setForm(p => ({ ...p, fare: e.target.value }))}
                  placeholder={est || "Enter fare"}
                  className="w-full bg-hy3n-bg border border-hy3n-gold/40 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60"
                />
                {est && (
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, fare: est }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-hy3n-gold hover:underline">Auto</button>
                )}
              </div>
              {est && <p className="text-xs text-muted-foreground mt-1">Est: GHS {est}</p>}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                {["requested","accepted","in_progress","completed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Payment */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Payment</label>
              <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                {["Cash","Mobile Money","Card"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {saving ? "Saving..." : "Save Ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}