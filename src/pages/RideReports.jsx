import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import {
  Package, MessageSquare, AlertCircle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Search, RefreshCw, Phone, User, Car
} from "lucide-react";
import { format } from "date-fns";

const TYPE_CONFIG = {
  lost_item: { label: "Lost Item", icon: Package, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  complaint: { label: "Complaint", icon: MessageSquare, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  driver_behavior: { label: "Driver Behavior", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  cheating: { label: "Overcharging", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  other: { label: "Other", icon: MessageSquare, color: "text-muted-foreground bg-secondary border-border" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Clock },
  resolved: { label: "Resolved", color: "text-green-500 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-muted-foreground bg-secondary border-border", icon: CheckCircle2 },
};

const SEVERITY_COLORS = {
  low: "text-muted-foreground",
  medium: "text-blue-400",
  high: "text-amber-500",
  critical: "text-red-500 font-bold",
};

export default function RideReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState({});

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await firebaseClient.entities.RideReport.list("-created_date", 300);
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const updateStatus = async (report, status) => {
    await firebaseClient.entities.RideReport.update(report.id, {
      status,
      updated_date: new Date().toISOString(),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    });
    fetchReports();
  };

  const sendReply = async (report) => {
    const reply = replyText[report.id]?.trim();
    if (!reply) return;
    setReplying(p => ({ ...p, [report.id]: true }));
    try {
      await firebaseClient.entities.RideReport.update(report.id, {
        admin_reply: reply,
        admin_replied_at: new Date().toISOString(),
        status: "in_progress",
        updated_date: new Date().toISOString(),
      });
      setReplyText(p => ({ ...p, [report.id]: "" }));
      fetchReports();
    } finally {
      setReplying(p => ({ ...p, [report.id]: false }));
    }
  };

  const markDriverNotified = async (report) => {
    await firebaseClient.entities.RideReport.update(report.id, {
      driver_notified: true,
      updated_date: new Date().toISOString(),
    });
    fetchReports();
  };

  const filtered = reports.filter(r => {
    const matchType = filterType === "all" || r.report_type === filterType;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.rider_name?.toLowerCase().includes(q) ||
      r.driver_name?.toLowerCase().includes(q) ||
      r.ticket_ref?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q);
    return matchType && matchStatus && matchSearch;
  });

  const openCount = reports.filter(r => r.status === "open").length;
  const lostCount = reports.filter(r => r.report_type === "lost_item" && r.status === "open").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Complaints</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {openCount} open
            {lostCount > 0 && <span className="text-amber-500 ml-2">· {lostCount} lost item{lostCount > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open", value: reports.filter(r => r.status === "open").length, color: "text-red-400" },
          { label: "In Progress", value: reports.filter(r => r.status === "in_progress").length, color: "text-amber-400" },
          { label: "Lost Items", value: reports.filter(r => r.report_type === "lost_item").length, color: "text-amber-400" },
          { label: "Resolved", value: reports.filter(r => r.status === "resolved").length, color: "text-green-400" },
        ].map(card => (
          <div key={card.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ref, description..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="lost_item">Lost Item</option>
          <option value="complaint">Complaint</option>
          <option value="driver_behavior">Driver Behavior</option>
          <option value="cheating">Overcharging</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading reports...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No reports found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const typeConf = TYPE_CONFIG[report.report_type] || TYPE_CONFIG.other;
            const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            const isExpanded = expanded === report.id;
            const createdAt = report.created_date
              ? format(new Date(report.created_date), "d MMM yyyy, h:mm a")
              : "—";

            return (
              <div
                key={report.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Card Header */}
                <button
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : report.id)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${typeConf.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{typeConf.label}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                      {report.severity && report.severity !== "medium" && (
                        <span className={`text-[10px] font-medium uppercase ${SEVERITY_COLORS[report.severity]}`}>
                          {report.severity}
                        </span>
                      )}
                      {report.report_type === "lost_item" && !report.driver_notified && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                          Driver Not Notified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{report.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="font-mono text-primary">{report.ticket_ref || "—"}</span>
                      <span>{createdAt}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    {/* People */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" /> Rider
                        </div>
                        <p className="text-sm font-semibold text-white">{report.rider_name || "—"}</p>
                        {report.rider_phone && (
                          <a href={`tel:${report.rider_phone}`} className="flex items-center gap-1 text-xs text-primary">
                            <Phone className="w-3 h-3" /> {report.rider_phone}
                          </a>
                        )}
                        {report.rider_email && (
                          <p className="text-[10px] text-muted-foreground truncate">{report.rider_email}</p>
                        )}
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Car className="w-3 h-3" /> Driver
                        </div>
                        <p className="text-sm font-semibold text-white">{report.driver_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{report.driver_id?.slice(0, 16) || "—"}</p>
                      </div>
                    </div>

                    {/* Trip Info */}
                    <div className="bg-white/5 rounded-lg p-3 space-y-1 text-xs">
                      <p className="text-muted-foreground">Trip</p>
                      <p className="text-white">📍 {report.pickup_address || "—"} → {report.destination_address || "—"}</p>
                      <p className="text-muted-foreground font-mono">Ride ID: {report.ride_id?.slice(0, 20) || "—"}</p>
                    </div>

                    {/* Full Description */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{report.description}</p>
                    </div>

                    {/* Admin Reply (existing) */}
                    {report.admin_reply && (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                        <p className="text-xs text-primary font-semibold mb-1">Your Reply</p>
                        <p className="text-sm text-white whitespace-pre-wrap">{report.admin_reply}</p>
                        {report.admin_replied_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sent {format(new Date(report.admin_replied_at), "d MMM, h:mm a")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reply Box */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {report.admin_reply ? "Update Reply" : "Send Reply to Rider"}
                      </p>
                      <textarea
                        rows={3}
                        value={replyText[report.id] || ""}
                        onChange={e => setReplyText(p => ({ ...p, [report.id]: e.target.value }))}
                        placeholder="Type your response to the rider..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30 resize-none"
                      />
                      <button
                        onClick={() => sendReply(report)}
                        disabled={!replyText[report.id]?.trim() || replying[report.id]}
                        className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-colors"
                      >
                        {replying[report.id] ? "Sending..." : "Send Reply"}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {report.report_type === "lost_item" && !report.driver_notified && (
                        <button
                          onClick={() => markDriverNotified(report)}
                          className="flex-1 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                        >
                          ✓ Mark Driver Notified
                        </button>
                      )}
                      {report.status === "open" && (
                        <button
                          onClick={() => updateStatus(report, "in_progress")}
                          className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {report.status !== "resolved" && report.status !== "closed" && (
                        <button
                          onClick={() => updateStatus(report, "resolved")}
                          className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                      {report.status !== "closed" && (
                        <button
                          onClick={() => updateStatus(report, "closed")}
                          className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground text-xs font-semibold hover:bg-white/10 transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
