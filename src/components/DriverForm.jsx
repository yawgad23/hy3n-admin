import { useState, useRef } from "react";
import { X, Upload, Camera, Eye, EyeOff, User, Car, FileText, Lock } from "lucide-react";
import { firebaseClient } from "@/api/firebaseClient";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// ─── Document Upload Field ────────────────────────────────────────────────────
function DocUploadField({ label, value, onChange, required }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await firebaseClient.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {value ? (
        <div className="flex items-center gap-2">
          <a href={value} target="_blank" rel="noreferrer"
            className="text-xs text-hy3n-gold underline truncate max-w-[180px]">
            View uploaded file
          </a>
          <button type="button" onClick={() => onChange("")}
            className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-hy3n-bg border border-hy3n-border text-white hover:border-hy3n-gold/60 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? "Uploading..." : "Upload"}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-hy3n-bg border border-hy3n-border text-white hover:border-hy3n-gold/60 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Camera size={12} /> Camera
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 border-t border-hy3n-border mt-2">
      <Icon size={14} className="text-hy3n-gold" />
      <span className="text-xs font-semibold text-hy3n-gold uppercase tracking-wider">{title}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DriverForm({ driver, onClose, onSaved }) {
  const isEdit = !!driver?.id;

  const [form, setForm] = useState({
    // Account
    email: driver?.email || "",
    password: "",
    // Personal
    full_name: driver?.full_name || "",
    phone: driver?.phone || "",
    city: driver?.city || "",
    // Vehicle
    vehicle_type: driver?.vehicle_type || "Sedan",
    vehicle_make: driver?.vehicle_make || "",
    vehicle_model: driver?.vehicle_model || "",
    vehicle_color: driver?.vehicle_color || "",
    vehicle_plate: driver?.vehicle_plate || "",
    license_number: driver?.license_number || "",
    // Status
    status: driver?.status || "Active",
    approval_status: driver?.approval_status || "approved",
    // Documents
    ghana_card_front_url: driver?.ghana_card_front_url || "",
    ghana_card_back_url: driver?.ghana_card_back_url || "",
    license_front_url: driver?.license_front_url || "",
    license_back_url: driver?.license_back_url || "",
    vehicle_photo_url: driver?.vehicle_photo_url || "",
    insurance_url: driver?.insurance_url || "",
    roadworthy_url: driver?.roadworthy_url || "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        const { password, ...data } = form;
        await firebaseClient.entities.DriverProfile.update(driver.id, data);
      } else {
        if (!form.email || !form.password) {
          setError("Email and password are required to create a driver account.");
          setSaving(false);
          return;
        }
        if (form.password.length < 6) {
          setError("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }
        const auth = getAuth();
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const uid = cred.user.uid;
        const { password, ...profileData } = form;
        await firebaseClient.entities.DriverProfile.create({
          ...profileData,
          uid,
          created_by_admin: true,
          approval_status: form.approval_status || "approved",
        });
      }
      onSaved();
    } catch (err) {
      console.error("DriverForm error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Use a different email or edit the existing driver.");
      } else {
        setError(err.message || "Failed to save driver.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border sticky top-0 bg-hy3n-surface z-10">
          <h2 className="font-semibold text-white text-lg">{isEdit ? "Edit Driver" : "Add New Driver"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── Account ── */}
          {!isEdit && <SectionHeader icon={Lock} title="Account Credentials" />}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  required
                  placeholder="driver@example.com"
                  className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:border-hy3n-gold/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Personal Info ── */}
          <SectionHeader icon={User} title="Personal Information" />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)}
                required placeholder="e.g. Kwame Mensah"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Phone Number</label>
              <div className="flex gap-2">
                <span className="flex items-center justify-center h-9 px-3 rounded-xl border border-hy3n-border bg-hy3n-bg text-sm text-muted-foreground select-none">🇬🇭 +233</span>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ''))}
                  placeholder="24 123 4567" maxLength={9}
                  className="flex-1 bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">City</label>
              <input type="text" value={form.city} onChange={e => set("city", e.target.value)}
                placeholder="e.g. Accra"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60">
                {["Active", "Inactive", "Suspended", "Pending"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Approval Status</label>
              <select value={form.approval_status} onChange={e => set("approval_status", e.target.value)}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60">
                {["approved", "pending", "rejected"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Vehicle Info ── */}
          <SectionHeader icon={Car} title="Vehicle Information" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60">
                {["Sedan", "SUV", "Tricycle", "Motorcycle", "Minivan"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Vehicle Make</label>
              <input type="text" value={form.vehicle_make} onChange={e => set("vehicle_make", e.target.value)}
                placeholder="e.g. Toyota"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Vehicle Model</label>
              <input type="text" value={form.vehicle_model} onChange={e => set("vehicle_model", e.target.value)}
                placeholder="e.g. Camry"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Vehicle Colour</label>
              <select value={form.vehicle_color} onChange={e => set("vehicle_color", e.target.value)}
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60">
                <option value="">Select colour</option>
                {["Black","White","Silver","Grey","Red","Blue","Green","Yellow","Orange","Brown","Gold","Maroon","Beige","Purple","Other"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">License Plate</label>
              <input type="text" value={form.vehicle_plate} onChange={e => set("vehicle_plate", e.target.value.toUpperCase())}
                placeholder="e.g. GR 1234-24"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Driver's License No.</label>
              <input type="text" value={form.license_number} onChange={e => set("license_number", e.target.value)}
                placeholder="e.g. DL123456"
                className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
            </div>
          </div>

          {/* ── Documents ── */}
          <SectionHeader icon={FileText} title="Documents" />
          <div className="grid grid-cols-2 gap-4">
            <DocUploadField label="Ghana Card — Front" value={form.ghana_card_front_url}
              onChange={v => set("ghana_card_front_url", v)} />
            <DocUploadField label="Ghana Card — Back" value={form.ghana_card_back_url}
              onChange={v => set("ghana_card_back_url", v)} />
            <DocUploadField label="Driver's License — Front" value={form.license_front_url}
              onChange={v => set("license_front_url", v)} />
            <DocUploadField label="Driver's License — Back" value={form.license_back_url}
              onChange={v => set("license_back_url", v)} />
            <DocUploadField label="Vehicle Photo" value={form.vehicle_photo_url}
              onChange={v => set("vehicle_photo_url", v)} />
            <DocUploadField label="Insurance Certificate" value={form.insurance_url}
              onChange={v => set("insurance_url", v)} />
            <div className="col-span-2">
              <DocUploadField label="Road Worthy Certificate" value={form.roadworthy_url}
                onChange={v => set("roadworthy_url", v)} />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-4 border-t border-hy3n-border mt-4">
            <button type="button" onClick={onClose}
              className="flex-1 border border-hy3n-border text-muted-foreground hover:text-white py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
