import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Search, ClipboardList, Clock, CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";

const statusColors = {
  "pending":  "text-hy3n-gold bg-hy3n-gold/10",
  "approved": "text-hy3n-green bg-hy3n-green/10",
  "rejected": "text-hy3n-red bg-hy3n-red/10",
};

const statusIcons = {
  "pending":  Clock,
  "approved": CheckCircle,
  "rejected": XCircle,
};

export default function DriverApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected]         = useState(null);
  const [saving, setSaving]             = useState(null);

  const fetchApplications = () => {
    setLoading(true);
    firebaseClient.entities.DriverProfile.list("-created_date", 200).then(data => {
      setApplications(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  const counts = {
    All:      applications.length,
    pending:  applications.filter(a => a.approval_status === "pending").length,
    approved: applications.filter(a => a.approval_status === "approved").length,
    rejected: applications.filter(a => a.approval_status === "rejected").length,
  };

  const filtered = applications.filter(a => {
    const matchSearch = !search ||
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.phone?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.license_plate?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || a.approval_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (driver, newStatus) => {
    setSaving(driver.id + newStatus);
    await firebaseClient.entities.DriverProfile.update(driver.id, { approval_status: newStatus });
    setSaving(null);
    setSelected(null);
    fetchApplications();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Driver Applications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Review and approve new driver sign-ups</p>
        </div>
        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 bg-hy3n-surface border border-hy3n-border hover:border-hy3n-gold/40 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { key: "pending",  label: "Awaiting Review", icon: Clock,       color: "text-hy3n-gold"  },
          { key: "approved", label: "Approved",        icon: CheckCircle, color: "text-hy3n-green" },
          { key: "rejected", label: "Rejected",        icon: XCircle,     color: "text-hy3n-red"   },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "All" : key)}
            className={`bg-hy3n-surface border rounded-2xl p-4 text-left transition-all hover:scale-[1.02] ${
              filterStatus === key ? "border-hy3n-gold/50" : "border-hy3n-border"
            }`}
          >
            <Icon size={20} className={`${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, email, plate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-hy3n-surface border border-hy3n-border text-white placeholder:text-muted-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-hy3n-gold/60"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "pending", "approved", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize ${
                filterStatus === s ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"
              }`}
            >
              {s} {counts[s] > 0 && s !== "All" ? `(${counts[s]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Applications list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardList size={40} className="text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No applications found</p>
          <p className="text-xs text-muted-foreground/60">Drivers who register via the Driver App will appear here</p>
        </div>
      ) : (
        <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wide border-b border-hy3n-border bg-white/2">
                  <th className="text-left px-5 py-3">Driver</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Vehicle</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Service Type</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => {
                  const StatusIcon = statusIcons[app.approval_status] || Clock;
                  return (
                    <tr key={app.id} className="border-b border-hy3n-border/40 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-hy3n-gold/10 border border-hy3n-gold/20 flex items-center justify-center text-hy3n-gold font-bold text-xs shrink-0">
                            {app.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-white font-medium leading-tight">{app.full_name}</p>
                            <p className="text-muted-foreground text-xs">{app.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <p className="text-white text-xs">{[app.vehicle_make, app.vehicle_model, app.vehicle_year].filter(Boolean).join(" ") || "—"}</p>
                        <p className="text-muted-foreground text-xs">{app.license_plate || ""}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <p className="text-white text-xs capitalize">{app.service_type || "Car"}</p>
                        <p className="text-muted-foreground text-[10px] capitalize">{(app.ride_categories || ["standard"]).join(", ")}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[app.approval_status] || "text-muted-foreground bg-white/5"}`}>
                          <StatusIcon size={11} />
                          {app.approval_status || "pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelected(app)}
                          className="inline-flex items-center gap-1.5 text-xs text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye size={13} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inline approval modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border sticky top-0 bg-hy3n-surface z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-hy3n-gold/15 border border-hy3n-gold/30 flex items-center justify-center text-hy3n-gold font-bold">
                  {selected.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <h2 className="text-white font-bold">{selected.full_name}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{selected.approval_status || "pending"}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-white p-1 text-lg">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-white/3 rounded-xl p-4">
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-white">{selected.phone || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-white">{selected.email || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Vehicle</p><p className="text-white">{[selected.vehicle_make, selected.vehicle_model, selected.vehicle_year].filter(Boolean).join(" ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Plate</p><p className="text-white">{selected.license_plate || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Color</p><p className="text-white">{selected.vehicle_color || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">MoMo</p><p className="text-white">{selected.momo_number || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Service Type</p><p className="text-white capitalize">{selected.service_type || "Car"}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Ride Categories</p><p className="text-white capitalize">{(selected.ride_categories || ["standard"]).join(", ")}</p></div>
              </div>

              {(selected.ghana_card_front_url || selected.ghana_card_url || selected.drivers_license_front_url || selected.drivers_license_url || selected.vehicle_registration_url || selected.insurance_url || selected.roadworthy_url) && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Documents</p>
                  {[
                    { label: "Ghana Card — Front",       url: selected.ghana_card_front_url || selected.ghana_card_url },
                    { label: "Ghana Card — Back",        url: selected.ghana_card_back_url },
                    { label: "Driver's License — Front", url: selected.drivers_license_front_url || selected.drivers_license_url },
                    { label: "Driver's License — Back",  url: selected.drivers_license_back_url },
                    { label: "Vehicle Registration",     url: selected.vehicle_registration_url },
                    { label: "Insurance",                url: selected.insurance_url },
                    { label: "Roadworthy Certificate",   url: selected.roadworthy_url },
                  ].filter(d => d.url).map(d => (
                    <a key={d.label} href={d.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-hy3n-gold text-xs hover:underline">
                      <Eye size={12} /> {d.label}
                    </a>
                  ))}
                </div>
              )}

              {selected.approval_status !== "approved" ? (
                <div className="flex gap-3 pt-2 border-t border-hy3n-border">
                  <button
                    onClick={() => updateStatus(selected, "approved")}
                    disabled={!!saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-hy3n-green/10 text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    {saving === selected.id + "approved" ? "Approving…" : "Approve Driver"}
                  </button>
                  {selected.approval_status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(selected, "rejected")}
                      disabled={!!saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-hy3n-red/10 text-hy3n-red border border-hy3n-red/30 hover:bg-hy3n-red/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      {saving === selected.id + "rejected" ? "Rejecting…" : "Reject"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-hy3n-green text-sm font-semibold pt-2 border-t border-hy3n-border">
                  <CheckCircle size={16} /> This driver is approved and can go online
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
