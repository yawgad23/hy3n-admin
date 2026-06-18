import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, MessageSquare, UserCheck, AlertCircle, Car, CreditCard, Flag, Info } from "lucide-react";
import { firebaseClient } from "@/api/firebaseClient";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  support_ticket:       { icon: MessageSquare, color: "text-blue-400",   bg: "bg-blue-500/10",   label: "Support Ticket" },
  driver_application:   { icon: UserCheck,     color: "text-green-400",  bg: "bg-green-500/10",  label: "Driver Application" },
  commission_pending:   { icon: CreditCard,    color: "text-amber-400",  bg: "bg-amber-500/10",  label: "Commission Review" },
  complaint:            { icon: Flag,          color: "text-red-400",    bg: "bg-red-500/10",    label: "Complaint" },
  ride_issue:           { icon: Car,           color: "text-purple-400", bg: "bg-purple-500/10", label: "Ride Issue" },
  general:              { icon: Bell,          color: "text-gray-400",   bg: "bg-gray-500/10",   label: "Notification" },
};

export default function AdminNotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    loadNotifications();
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const [tickets, applications, commissions] = await Promise.all([
        firebaseClient.entities.SupportTicket?.list?.("created_date", 10).catch(() => []),
        firebaseClient.entities.DriverApplication?.list?.("created_date", 10).catch(() => []),
        firebaseClient.entities.CommissionPayment?.filter?.({ status: "pending" }).catch(() => []),
      ]);

      const items = [];

      (tickets || []).forEach(t => {
        items.push({
          id: `ticket_${t.id}`,
          type: t.category === "complaint" ? "complaint" : "support_ticket",
          title: t.subject || "New Support Ticket",
          body: `From ${t.user_type === "driver" ? "Driver" : "Rider"}: ${(t.message || "").slice(0, 80)}${(t.message || "").length > 80 ? "..." : ""}`,
          created_date: t.created_date,
          read: t.status !== "open",
          link: "/support",
        });
      });

      (applications || []).forEach(a => {
        if (a.status === "pending") {
          items.push({
            id: `app_${a.id}`,
            type: "driver_application",
            title: "New Driver Application",
            body: `${a.full_name || "A driver"} has submitted an application and is awaiting review.`,
            created_date: a.created_date,
            read: false,
            link: "/applications",
          });
        }
      });

      (commissions || []).forEach(c => {
        items.push({
          id: `comm_${c.id}`,
          type: "commission_pending",
          title: "Commission Awaiting Review",
          body: `Driver submitted GH₵${c.amount || 50} commission with reference: ${c.transaction_reference || "—"}`,
          created_date: c.created_date,
          read: false,
          link: "/daily-commissions",
        });
      });

      items.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } catch (err) {
      console.warn("Admin notification load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-16 right-4 z-50 w-full max-w-sm bg-[#1a1f2e] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                <h2 className="font-bold text-sm text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-yellow-400 font-semibold hover:text-yellow-300">
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-3 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Bell className="w-10 h-10 text-white/20 mb-2" />
                  <p className="font-semibold text-white text-sm">All caught up!</p>
                  <p className="text-xs text-white/40 mt-1">New support tickets, applications, and commission reviews will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {notifications.map((notif) => {
                    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                    const Icon = config.icon;
                    const timeAgo = notif.created_date
                      ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })
                      : "";
                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${!notif.read ? "bg-white/5" : ""}`}
                        onClick={() => {
                          if (notif.link) window.location.href = notif.link;
                          onClose();
                        }}
                      >
                        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-semibold leading-snug ${!notif.read ? "text-white" : "text-white/70"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {notif.body && (
                            <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{notif.body}</p>
                          )}
                          {timeAgo && (
                            <p className="text-[10px] text-white/30 mt-1">{timeAgo}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
