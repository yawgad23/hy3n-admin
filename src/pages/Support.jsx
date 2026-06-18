import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { Plus, MessageSquare, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import SupportTicketForm from "../components/SupportTicketForm";
import { toast } from "sonner";

const priorityColors = {
  "Low": "text-muted-foreground bg-white/5",
  "Medium": "text-blue-400 bg-blue-400/10",
  "High": "text-hy3n-gold bg-hy3n-gold/10",
  "Urgent": "text-hy3n-red bg-hy3n-red/10",
};

const statusConfig = {
  "Open": { color: "text-hy3n-red bg-hy3n-red/10", icon: AlertCircle },
  "In Progress": { color: "text-hy3n-gold bg-hy3n-gold/10", icon: Clock },
  "Resolved": { color: "text-hy3n-green bg-hy3n-green/10", icon: CheckCircle },
  "Closed": { color: "text-muted-foreground bg-white/5", icon: CheckCircle },
};

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState({});

  const fetchTickets = () => {
    setLoading(true);
    firebaseClient.entities.SupportTicket.list("-created_date", 200).then(data => {
      setTickets(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (ticket, status) => {
    const update = { status };
    if (status === "Resolved") update.resolved_at = new Date().toLocaleString();
    await firebaseClient.entities.SupportTicket.update(ticket.id, update);
    fetchTickets();
  };

  const sendReply = async (ticket) => {
    const reply = replyText[ticket.id];
    if (!reply?.trim()) return;
    await firebaseClient.entities.SupportTicket.update(ticket.id, {
      admin_reply: reply,
      status: "In Progress",
    });

    // Call a Cloud Function to send a notification to the user
    firebaseClient.functions.sendSupportReplyNotification({ ticketId: ticket.id, replyText: reply });
    setReplyText(p => ({ ...p, [ticket.id]: "" }));
    fetchTickets();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ticket?")) return;
    await firebaseClient.entities.SupportTicket.delete(id);
    fetchTickets();
  };

  const filtered = tickets.filter(t => {
    const ms = filterStatus === "All" || t.status === filterStatus;
    const mp = filterPriority === "All" || t.priority === filterPriority;
    return ms && mp;
  });

  const openCount = tickets.filter(t => t.status === "Open").length;
  const urgentCount = tickets.filter(t => t.priority === "Urgent" && t.status !== "Closed").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Support</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {openCount} open tickets {urgentCount > 0 && <span className="text-hy3n-red">· {urgentCount} urgent</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditTicket(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open", count: tickets.filter(t => t.status === "Open").length, color: "text-hy3n-red" },
          { label: "In Progress", count: tickets.filter(t => t.status === "In Progress").length, color: "text-hy3n-gold" },
          { label: "Resolved", count: tickets.filter(t => t.status === "Resolved").length, color: "text-hy3n-green" },
          { label: "Urgent", count: urgentCount, color: "text-hy3n-red" },
        ].map(s => (
          <div key={s.label} className="bg-hy3n-surface border border-hy3n-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          {["All", "Open", "In Progress", "Resolved", "Closed"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterStatus === s ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {["All", "Urgent", "High", "Medium", "Low"].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterPriority === p ? "bg-hy3n-gold text-black" : "bg-hy3n-surface border border-hy3n-border text-muted-foreground hover:text-white"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const sc = statusConfig[ticket.status] || statusConfig["Open"];
            const StatusIcon = sc.icon;
            const isOpen = expanded === ticket.id;

            return (
              <div key={ticket.id} className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden hover:border-hy3n-gold/20 transition-colors">
                <div
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : ticket.id)}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare size={16} className="text-hy3n-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{ticket.subject}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.color}`}>
                        <StatusIcon size={10} /> {ticket.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">{ticket.from_name} · {ticket.category || "General"} · {new Date(ticket.created_date).toLocaleDateString()}</p>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{ticket.message}</p>
                  </div>
                  <div className="text-muted-foreground ml-2 flex-shrink-0">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-hy3n-border/50 pt-4 space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Full Message</p>
                      <p className="text-white text-sm">{ticket.message}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {ticket.from_phone && <div><p className="text-muted-foreground">Phone</p><p className="text-white font-medium">{ticket.from_phone}</p></div>}
                      {ticket.from_email && <div><p className="text-muted-foreground">Email</p><p className="text-white font-medium">{ticket.from_email}</p></div>}
                      {ticket.related_ride_id && <div><p className="text-muted-foreground">Ride ID</p><p className="text-white font-medium">{ticket.related_ride_id}</p></div>}
                      {ticket.resolved_at && <div><p className="text-muted-foreground">Resolved At</p><p className="text-white font-medium">{ticket.resolved_at}</p></div>}
                    </div>

                    {ticket.admin_reply && (
                      <div className="bg-hy3n-gold/10 border border-hy3n-gold/20 rounded-xl p-4">
                        <p className="text-xs text-hy3n-gold font-medium mb-1">Admin Reply</p>
                        <p className="text-white text-sm">{ticket.admin_reply}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Reply to this ticket</p>
                      <textarea
                        value={replyText[ticket.id] || ""}
                        onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60 resize-none"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => sendReply(ticket)} className="text-xs bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">Send Reply</button>
                        {ticket.status !== "Resolved" && (
                          <button onClick={() => updateStatus(ticket, "Resolved")} className="text-xs text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/10 px-3 py-1.5 rounded-lg transition-colors">Mark Resolved</button>
                        )}
                        {ticket.status !== "Closed" && (
                          <button onClick={() => updateStatus(ticket, "Closed")} className="text-xs text-muted-foreground border border-hy3n-border hover:text-white px-3 py-1.5 rounded-lg transition-colors">Close Ticket</button>
                        )}
                        {ticket.status === "Open" && (
                          <button onClick={() => updateStatus(ticket, "In Progress")} className="text-xs text-hy3n-gold border border-hy3n-gold/30 hover:bg-hy3n-gold/10 px-3 py-1.5 rounded-lg transition-colors">Start Working</button>
                        )}
                        <button onClick={() => { setEditTicket(ticket); setShowForm(true); }} className="text-xs text-muted-foreground hover:text-white ml-auto transition-colors">Edit</button>
                        <button onClick={() => handleDelete(ticket.id)} className="text-xs text-hy3n-red hover:underline transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-hy3n-surface border border-hy3n-border rounded-2xl">No tickets found</div>
          )}
        </div>
      )}

      {showForm && (
        <SupportTicketForm
          ticket={editTicket}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchTickets(); }}
        />
      )}
    </div>
  );
}