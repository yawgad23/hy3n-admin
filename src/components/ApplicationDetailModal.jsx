import { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X, User, Car, FileText, CheckCircle, XCircle, Clock, Eye, CreditCard, Tag } from "lucide-react";

const ALL_CATEGORIES = [
  { id: 'standard',         label: 'Standard' },
  { id: 'comfort',          label: 'Comfort' },
  { id: 'kantanka',         label: 'Kantanka' },
  { id: 'executive',        label: 'Executive' },
  { id: 'okada',            label: 'Okada' },
  { id: 'express_delivery', label: 'Express Delivery' },
];

const statusColors = {
  "Pending": "text-hy3n-gold bg-hy3n-gold/10",
  "Under Review": "text-blue-400 bg-blue-400/10",
  "Approved": "text-hy3n-green bg-hy3n-green/10",
  "Rejected": "text-hy3n-red bg-hy3n-red/10",
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}

function PhotoCard({ label, url }) {
  if (!url) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="relative group rounded-xl overflow-hidden border border-hy3n-border h-32 bg-white/5 flex items-center justify-center hover:border-hy3n-gold/40 transition-colors">
        <img src={url} alt={label} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye size={18} className="text-white" />
        </div>
      </a>
    </div>
  );
}

export default function ApplicationDetailModal({ application, onClose, onUpdated }) {
  const [rejectionReason, setRejectionReason] = useState(application.rejection_reason || "");
  const [saving, setSaving] = useState(null);
  const [editingCategories, setEditingCategories] = useState(false);
  const [draftCategories, setDraftCategories] = useState(application.ride_categories || []);

  const toggleDraftCategory = (id) => {
    setDraftCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const saveCategories = async () => {
    setSaving('categories');
    await firebaseClient.entities.DriverProfile.update(application.id, { ride_categories: draftCategories });
    setSaving(null);
    setEditingCategories(false);
    onUpdated();
  };

  const updateStatus = async (status) => {
    setSaving(status);
    const now = new Date().toISOString();
    const user = await firebaseClient.auth.me();
    const updates = { status, reviewed_by: user?.email || "Admin", reviewed_at: now };
    if (status === "Rejected") {
      updates.rejection_reason = rejectionReason;
      updates.rejection_note = rejectionReason;  // mobile app reads both fields
      updates.approval_status = 'rejected';
    }
    if (status === "Approved") {
      updates.approval_status = 'approved';
    }
    await firebaseClient.entities.DriverProfile.update(application.id, updates);

    // Send push notification to driver via push_notifications collection
    if (status === 'Approved' || status === 'Rejected') {
      try {
        await firebaseClient.entities.PushNotification.create({
          user_id: application.user_id || application.id,
          type: status === 'Approved' ? 'approval_approved' : 'approval_rejected',
          title: status === 'Approved'
            ? "You're Approved! 🎉"
            : 'Application Update',
          body: status === 'Approved'
            ? 'Welcome to HY3N! Your driver account is ready. Start driving and earning now.'
            : (rejectionReason || 'Your application was not approved. Please contact support for details.'),
          read: false,
          created_date: now,
        });
      } catch (e) {
        console.warn('Push notification write failed:', e);
      }
    }

    if (status === "Approved") {
      await firebaseClient.entities.DriverProfile.create({
        full_name: application.full_name,
        phone: application.phone,
        email: application.email,
        city: application.city,
        vehicle_type: application.vehicle_type,
        vehicle_model: application.vehicle_model,
        vehicle_plate: application.vehicle_plate,
        license_number: application.license_number,
        status: "Active",
        is_online: false,
      });
    }
    setSaving(null);
    onUpdated();
  };

  const a = application;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border sticky top-0 bg-hy3n-surface z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hy3n-gold/15 border border-hy3n-gold/30 flex items-center justify-center text-hy3n-gold font-bold">
              {a.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="text-white font-bold">{a.full_name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>{a.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal Info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User size={15} className="text-hy3n-gold" />
              <h3 className="text-sm font-semibold text-white">Personal Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-white/3 rounded-xl p-4">
              <InfoRow label="Full Name" value={a.full_name} />
              <InfoRow label="Phone" value={a.phone} />
              <InfoRow label="Email" value={a.email} />
              <InfoRow label="City" value={a.city} />
              <InfoRow label="License Number" value={a.license_number} />
            </div>
          </section>

          {/* Vehicle Info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Car size={15} className="text-hy3n-gold" />
              <h3 className="text-sm font-semibold text-white">Vehicle Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-white/3 rounded-xl p-4">
              <InfoRow label="Vehicle Type" value={a.vehicle_type} />
              <InfoRow label="Model" value={a.vehicle_model || a.vehicle_full_model} />
              <InfoRow label="Plate Number" value={a.vehicle_plate || a.license_plate} />
              <InfoRow label="Color" value={a.vehicle_color} />
              <InfoRow label="Service Type" value={a.service_type} />
            </div>
          </section>

          {/* Ride Categories */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-hy3n-gold" />
                <h3 className="text-sm font-semibold text-white">Ride Categories</h3>
              </div>
              {!editingCategories ? (
                <button onClick={() => setEditingCategories(true)} className="text-xs text-hy3n-gold hover:underline">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCategories(false); setDraftCategories(a.ride_categories || []); }} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                  <button onClick={saveCategories} disabled={saving === 'categories'} className="text-xs text-hy3n-gold font-semibold hover:underline disabled:opacity-50">{saving === 'categories' ? 'Saving…' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editingCategories ? (
              <div className="flex flex-wrap gap-2">
                {(a.ride_categories?.length > 0 ? a.ride_categories : ['—']).map(cat => (
                  <span key={cat} className="text-xs font-semibold px-3 py-1 rounded-full bg-hy3n-gold/10 text-hy3n-gold border border-hy3n-gold/30">{cat}</span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map(cat => {
                  const selected = draftCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleDraftCategory(cat.id)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                        selected
                          ? 'bg-hy3n-gold/20 text-hy3n-gold border-hy3n-gold/50'
                          : 'bg-white/5 text-muted-foreground border-hy3n-border hover:border-hy3n-gold/30'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Documents */}
          {(a.license_photo_url || a.vehicle_photo_url || a.profile_photo_url || a.id_card_url || a.vehicle_reg_url) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-hy3n-gold" />
                <h3 className="text-sm font-semibold text-white">Documents &amp; Photos</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <PhotoCard label="Profile Photo" url={a.profile_photo_url} />
                <PhotoCard label="Driver's License" url={a.license_photo_url} />
                <PhotoCard label="Ghana Card / ID" url={a.id_card_url} />
                <PhotoCard label="Vehicle Photo" url={a.vehicle_photo_url} />
                <PhotoCard label="Vehicle Registration" url={a.vehicle_reg_url} />
              </div>
            </section>
          )}

          {/* Bank / Payment Details */}
          {(a.bank_name || a.mobile_money_number) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={15} className="text-hy3n-gold" />
                <h3 className="text-sm font-semibold text-white">Payment Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white/3 rounded-xl p-4">
                <InfoRow label="Mobile Money Provider" value={a.mobile_money_provider} />
                <InfoRow label="Mobile Money Number" value={a.mobile_money_number} />
                <InfoRow label="Bank Name" value={a.bank_name} />
                <InfoRow label="Account Number" value={a.bank_account_number} />
                <InfoRow label="Account Holder" value={a.bank_account_name} />
              </div>
            </section>
          )}

          {a.notes && (
            <div className="bg-white/3 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
              <p className="text-sm text-white">{a.notes}</p>
            </div>
          )}

          {a.reviewed_by && (
            <div className="text-xs text-muted-foreground">
              Reviewed by <span className="text-white">{a.reviewed_by}</span> on {a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : "—"}
            </div>
          )}

          {/* Actions */}
          {(a.status === "Pending" || a.status === "Under Review") && (
            <section className="space-y-3 border-t border-hy3n-border pt-5">
              <h3 className="text-sm font-semibold text-white">Review Decision</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rejection Reason (required if rejecting)</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Documents unclear, invalid license, vehicle does not meet requirements..."
                  rows={3}
                  className="w-full bg-hy3n-bg border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus("Under Review")}
                  disabled={!!saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  <Clock size={15} />
                  {saving === "Under Review" ? "Saving…" : "Mark Under Review"}
                </button>
                <button
                  onClick={() => updateStatus("Approved")}
                  disabled={!!saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-hy3n-green/10 text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={15} />
                  {saving === "Approved" ? "Approving…" : "Approve Driver"}
                </button>
                <button
                  onClick={() => updateStatus("Rejected")}
                  disabled={!!saving || !rejectionReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-hy3n-red/10 text-hy3n-red border border-hy3n-red/30 hover:bg-hy3n-red/20 transition-colors disabled:opacity-50"
                >
                  <XCircle size={15} />
                  {saving === "Rejected" ? "Rejecting…" : "Reject"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Approving will automatically create a Driver account. Rejection reason is required to reject.</p>
            </section>
          )}

          {a.status === "Rejected" && a.rejection_reason && (
            <div className="bg-hy3n-red/5 border border-hy3n-red/20 rounded-xl p-4">
              <p className="text-xs text-hy3n-red font-semibold mb-1">Rejection Reason</p>
              <p className="text-sm text-white">{a.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}