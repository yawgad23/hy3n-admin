import { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X } from "lucide-react";

export default function RiderForm({ rider, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: rider?.full_name || "",
    phone: rider?.phone || "",
    email: rider?.email || "",
    city: rider?.city || "",
    status: rider?.status || "Active",
    total_rides: rider?.total_rides || "",
    total_spent: rider?.total_spent || "",
    rating: rider?.rating || "",
    preferred_payment: rider?.preferred_payment || "Cash",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    ["total_rides","total_spent","rating"].forEach(k => { if (data[k]) data[k] = Number(data[k]); });
    if (rider?.id) {
      await firebaseClient.entities.RiderProfile.update(rider.id, data);
    } else {
      await firebaseClient.entities.RiderProfile.create(data);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border">
          <h2 className="font-semibold text-white">{rider ? "Edit Rider" : "Add Rider"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: "full_name", label: "Full Name", required: true },
            { key: "phone", label: "Phone", required: true },
            { key: "email", label: "Email" },
            { key: "city", label: "City" },
            { key: "total_rides", label: "Total Rides", number: true },
            { key: "total_spent", label: "Total Spent (GHS)", number: true },
            { key: "rating", label: "Rating (1-5)", number: true },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{f.label}</label>
              <input
                type={f.number ? "number" : "text"}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                required={f.required}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
              {["Active","Inactive","Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Preferred Payment</label>
            <select value={form.preferred_payment} onChange={e => setForm(p => ({ ...p, preferred_payment: e.target.value }))}
              className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
              {["Cash","Mobile Money","Card"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {saving ? "Saving..." : "Save Rider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}