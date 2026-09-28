import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/api/adminApi";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, Tag, TrendingDown, Gift, AlertTriangle, Megaphone,
  Send, Users, CheckCircle2, Clock, Loader2
} from "lucide-react";

const NOTIFICATION_TEMPLATES = [
  {
    id: "promo",
    label: "Promo Code",
    icon: Gift,
    color: "bg-green-500",
    title: "🎉 Special Offer for You!",
    body: "Use code HY3N20 for 20% off your next ride. Valid today only!",
  },
  {
    id: "price_drop",
    label: "Price Drop",
    icon: TrendingDown,
    color: "bg-blue-500",
    title: "📉 Fares Just Dropped!",
    body: "Great news! Ride fares in your area have dropped. Book now and save!",
  },
  {
    id: "surge_warning",
    label: "Surge Alert",
    icon: AlertTriangle,
    color: "bg-orange-500",
    title: "⚡ High Demand in Your Area",
    body: "Fares are higher than usual right now due to high demand. Consider booking later to save.",
  },
  {
    id: "general",
    label: "General",
    icon: Megaphone,
    color: "bg-purple-500",
    title: "📢 Message from HY3N",
    body: "",
  },
];

export default function SendNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // The protected backend is the only place that sees device tokens or sends FCM.
  const { data: notificationOverview, isLoading: loadingRiders, refetch: refreshNotifications } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => adminApi.notifications(),
    refetchInterval: 60000,
  });
  const ridersWithTokens = notificationOverview?.enabledRiderCount || 0;

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setBody(template.body);
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) return;
    if (ridersWithTokens === 0) {
      setResult({ success: false, message: "No riders with push notifications enabled yet. Riders need to open the app and allow notifications first." });
      return;
    }

    setSending(true);
    setResult(null);
    setSendProgress({ sent: 0, total: ridersWithTokens });

    try {
      const response = await adminApi.broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        type: selectedTemplate || "general",
      });
      const { sentCount, failedCount, totalRecipients } = response;
      setSendProgress({ sent: totalRecipients, total: totalRecipients });
      await refreshNotifications();

      setResult({
        success: sentCount > 0,
        message: failedCount === 0
          ? `✅ Notification sent to all ${sentCount} rider${sentCount !== 1 ? "s" : ""} successfully!`
          : `Sent to ${sentCount} rider${sentCount !== 1 ? "s" : ""}. ${failedCount} failed (tokens may be expired).`,
        successCount: sentCount,
        failCount: failedCount,
      });

      setTitle("");
      setBody("");
      setSelectedTemplate(null);
    } catch (err) {
      setResult({ success: false, message: `Failed to send: ${err.message}` });
    } finally {
      setSending(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  const history = notificationOverview?.notifications || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Send Notifications</h1>
          <p className="text-muted-foreground text-sm">
            Push promos and alerts directly to riders' phones
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {loadingRiders ? "..." : ridersWithTokens} riders with notifications enabled
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" /> Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {NOTIFICATION_TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTemplate === t.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${t.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input
                  placeholder="e.g. 🎉 Special Offer for You!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={65}
                />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/65 characters</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea
                  placeholder="Write your message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">{body.length}/200 characters</p>
              </div>

              {/* Preview */}
              {(title || body) && (
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">PREVIEW (how it looks on phone)</p>
                  <div className="bg-card rounded-lg p-3 shadow-sm border border-border flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{title || "Title"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{body || "Message body"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Send progress */}
              {sending && sendProgress.total > 0 && (
                <div className="bg-blue-500/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Sending notifications...</span>
                    <span className="text-sm text-blue-600">{sendProgress.sent}/{sendProgress.total}</span>
                  </div>
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`flex items-start gap-2 p-3 rounded-xl ${
                  result.success ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
                }`}>
                  {result.success
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  }
                  <p className="text-sm">{result.message}</p>
                </div>
              )}

              <Button
                onClick={sendNotification}
                disabled={sending || ridersWithTokens === 0 || !title.trim() || !body.trim()}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending {sendProgress.sent}/{sendProgress.total}...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send to All {ridersWithTokens} Riders</>
                )}
              </Button>

              {ridersWithTokens === 0 && !loadingRiders && (
                <p className="text-xs text-muted-foreground text-center">
                  No riders have enabled notifications yet. Riders need to open the app and tap "Allow" on the notification prompt.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History Panel */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((n) => (
                    <div key={n.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-1">{n.title}</p>
                        <Badge variant={n.status === "sent" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {n.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {n.sent_count || n.total_recipients} sent · {new Date(n.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
