import { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X } from "lucide-react";

export default function SupportTicketForm({ ticket, onClose, onSaved }) {
  const [form, setForm] = useState({
    subject: ticket?.subject || "",
    message: ticket?.message || "",
    from_name: ticket?.from_name || "",
    from_phone: ticket?.from_phone || "",
    from_email: ticket?.from_email || "",
    category: ticket?.category || "Other",
    priority: ticket?.priority || "Medium",
    status: ticket?.status || "Open",
    related_ride_id: ticket?.related_ride_id || "",
    admin_reply: ticket?.admin_reply || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (ticket?.id) {
      await firebaseClient.entities.SupportTicket.update(ticket.id, form);
    } else {
      await firebaseClient.entities.SupportTicket.create(form);
    }
    onSaved();
  };

  const field = (key, label, type = "text", required = false) => (
    <div key={key}>
      <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={required}
        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
    </div>
  );

  const sel = (key, label, options) => (
    <div key={key}>
      <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
      <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border">
          <h2 className="font-semibold text-white">{ticket ? "Edit Ticket" : "New Support Ticket"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {field("subject", "Subject", "text", true)}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Message *</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={4}
              className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("from_name", "From Name", "text", true)}
            {field("from_phone", "Phone")}
            {field("from_email", "Email", "email")}
            {field("related_ride_id", "Related Ride ID")}
            {sel("category", "Category", ["Payment Issue","Driver Complaint","Rider Complaint","App Bug","Account Issue","Safety","Other"])}
            {sel("priority", "Priority", ["Low","Medium","High","Urgent"])}
            {sel("status", "Status", ["Open","In Progress","Resolved","Closed"])}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Admin Reply</label>
            <textarea value={form.admin_reply} onChange={e => setForm(p => ({ ...p, admin_reply: e.target.value }))} rows={3}
              className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Save Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}