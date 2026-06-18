import { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X } from "lucide-react";

export default function CommissionForm({ commission, onClose, onSaved }) {
  const [form, setForm] = useState({
    driver_name: commission?.driver_name || "",
    driver_phone: commission?.driver_phone || "",
    amount: commission?.amount || "",
    period: commission?.period || "",
    status: commission?.status || "Pending",
    notes: commission?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, amount: Number(form.amount) };
    if (commission?.id) {
      await firebaseClient.entities.Commission.update(commission.id, data);
    } else {
      await firebaseClient.entities.Commission.create(data);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border">
          <h2 className="font-semibold text-white">{commission ? "Edit Commission" : "Add Commission"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: "driver_name", label: "Driver Name", required: true },
            { key: "driver_phone", label: "Driver Phone" },
            { key: "amount", label: "Commission Amount (GHS)", number: true, required: true },
            { key: "period", label: "Period (e.g. Week of May 20)" },
            { key: "notes", label: "Notes" },
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
              {["Pending", "Paid"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}