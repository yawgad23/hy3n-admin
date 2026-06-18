import { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Upload, CheckCircle, ChevronRight, ChevronLeft, Car, User, FileText, CreditCard, AlertCircle } from "lucide-react";

const STEPS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "vehicle", label: "Vehicle Info", icon: Car },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "banking", label: "Bank Details", icon: CreditCard },
];

function UploadField({ label, value, onChange, required }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await firebaseClient.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl py-5 cursor-pointer transition-colors ${
        value ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50 hover:border-yellow-400 hover:bg-yellow-50"
      }`}>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-3 border-yellow-400/30 border-t-yellow-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Uploading…</span>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle size={24} className="text-green-500" />
            <span className="text-xs text-green-600 font-medium">Uploaded ✓</span>
            <span className="text-xs text-gray-400">Tap to replace</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={22} className="text-gray-400" />
            <span className="text-sm text-gray-500">Tap to upload</span>
            <span className="text-xs text-gray-400">JPG, PNG or PDF</span>
          </div>
        )}
      </label>
    </div>
  );
}

function Input({ label, value, onChange, required, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 transition"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-yellow-500 bg-white"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function DriverOnboarding() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", city: "",
    vehicle_type: "", vehicle_model: "", vehicle_plate: "", vehicle_year: "",
    license_number: "",
    license_photo_url: "", vehicle_photo_url: "", vehicle_reg_url: "",
    profile_photo_url: "", id_card_url: "",
    bank_name: "", bank_account_number: "", bank_account_name: "",
    mobile_money_number: "", mobile_money_provider: "",
  });

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const validateStep = () => {
    if (step === 0) return form.full_name && form.phone && form.city;
    if (step === 1) return form.vehicle_type && form.vehicle_model && form.vehicle_plate;
    if (step === 2) return form.license_photo_url && form.id_card_url;
    if (step === 3) return (form.bank_account_number && form.bank_name) || form.mobile_money_number;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    await firebaseClient.entities.DriverProfile.create({ ...form, status: "Pending" });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
          <p className="text-gray-500">Thank you for applying to drive with HY3N. Our team will review your documents and get back to you within 24–48 hours.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            Keep an eye on your phone <span className="font-semibold">{form.phone}</span> for updates.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white py-5 px-4 text-center">
        <div className="flex items-baseline justify-center gap-0.5 font-black text-3xl tracking-tight">
          <span>HY</span><span className="text-red-500">3</span><span className="text-yellow-400">N</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">Driver Partner Application</p>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 ${active ? "text-yellow-600" : done ? "text-green-600" : "text-gray-400"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    active ? "border-yellow-500 bg-yellow-50" : done ? "border-green-500 bg-green-50" : "border-gray-300 bg-white"
                  }`}>
                    {done ? <CheckCircle size={14} /> : <Icon size={13} />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${done ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Step 0 — Personal */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
            <Input label="Full Name" value={form.full_name} onChange={set("full_name")} required placeholder="John Doe" />
            <Input label="Phone Number" value={form.phone} onChange={set("phone")} required placeholder="+233 XX XXX XXXX" />
            <Input label="Email Address" value={form.email} onChange={set("email")} placeholder="john@email.com" />
            <Input label="City" value={form.city} onChange={set("city")} required placeholder="Accra" />
          </div>
        )}

        {/* Step 1 — Vehicle */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Vehicle Information</h2>
            <Select label="Vehicle Type" value={form.vehicle_type} onChange={set("vehicle_type")} required
              options={["Sedan", "SUV", "Tricycle", "Motorcycle", "Minivan"]} />
            <Input label="Vehicle Make & Model" value={form.vehicle_model} onChange={set("vehicle_model")} required placeholder="Toyota Camry" />
            <Input label="License Plate Number" value={form.vehicle_plate} onChange={set("vehicle_plate")} required placeholder="GR-1234-22" />
            <Input label="Vehicle Year" value={form.vehicle_year} onChange={set("vehicle_year")} placeholder="2020" />
            <Input label="Driver's License Number" value={form.license_number} onChange={set("license_number")} placeholder="DVL-12345678" />
          </div>
        )}

        {/* Step 2 — Documents */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Upload Documents</h2>
            <p className="text-sm text-gray-500">Please upload clear, readable photos or scans of each document.</p>
            <UploadField label="Driver's License" value={form.license_photo_url} onChange={set("license_photo_url")} required />
            <UploadField label="National ID / Ghana Card" value={form.id_card_url} onChange={set("id_card_url")} required />
            <UploadField label="Vehicle Registration Certificate" value={form.vehicle_reg_url} onChange={set("vehicle_reg_url")} />
            <UploadField label="Vehicle Photo" value={form.vehicle_photo_url} onChange={set("vehicle_photo_url")} />
            <UploadField label="Profile / Selfie Photo" value={form.profile_photo_url} onChange={set("profile_photo_url")} />
          </div>
        )}

        {/* Step 3 — Banking */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
            <p className="text-sm text-gray-500">Enter at least one payment method for receiving your earnings.</p>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Mobile Money</p>
              <Select label="Provider" value={form.mobile_money_provider} onChange={set("mobile_money_provider")}
                options={["MTN", "Telecel", "AirtelTigo"]} />
              <Input label="Mobile Money Number" value={form.mobile_money_number} onChange={set("mobile_money_number")} placeholder="0XX XXX XXXX" />
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Bank Account (optional)</p>
              <Input label="Bank Name" value={form.bank_name} onChange={set("bank_name")} placeholder="GCB Bank" />
              <Input label="Account Number" value={form.bank_account_number} onChange={set("bank_account_number")} placeholder="0123456789" />
              <Input label="Account Holder Name" value={form.bank_account_name} onChange={set("bank_account_name")} placeholder="John Doe" />
            </div>
          </div>
        )}

        {/* Review summary on last step */}
        {step === 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-2">
            <p className="text-sm font-bold text-yellow-800">Review your application</p>
            <div className="text-xs text-yellow-700 space-y-1">
              <p><span className="font-medium">Name:</span> {form.full_name}</p>
              <p><span className="font-medium">Phone:</span> {form.phone}</p>
              <p><span className="font-medium">Vehicle:</span> {form.vehicle_type} — {form.vehicle_model} ({form.vehicle_plate})</p>
              <p><span className="font-medium">Documents:</span> {[form.license_photo_url && "License", form.id_card_url && "ID Card", form.vehicle_reg_url && "Reg. Cert"].filter(Boolean).join(", ") || "None"}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:text-gray-900 py-3 rounded-xl text-sm font-semibold transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!validateStep()}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-black font-bold py-3 rounded-xl text-sm transition-colors">
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !validateStep()}
              className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-gray-900 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}