import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, Tag, TrendingDown, Gift, AlertTriangle, Megaphone,
  Send, Users, CheckCircle2, Clock, Loader2
} from "lucide-react";

// Service account credentials for FCM v1 API
const SA_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@hy3n26.iam.gserviceaccount.com";
const SA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtJ+4frik6X18I
TPRxJ77h7gqw7KhOlKfdV1oekf5/lYmKrGOdU/JLfN8KwgxHBZJ1rzCB2mVe/+ae
i9eJMWQC6NpExlbxaMJ+3om9Ifs+9EJ26S09zPga++bxVS9h1TnNzrEEGHM4zqwd
cKmwYVksUo+dVLIodgwlZ6YcIcc+Qmk3cLNUmGFfX9wf/wuS9ACtdS954zYEw16z
wv1mlRHfdANZWz4BoPWBRLV31KxZVCOHrJ7Si/zASEyzPxEfi9cfTvWA9lfpR/cc
iLp8RfyXn9lB8pS1B6tD/f9jCeBvw5D2wEMX1EFqi/PlR5c5seLH2Ut3MEIPY1Ff
WmqU05xTAgMBAAECggEAB+ihpljHZp8h3A3dFv4AaJlSwQSje1NW3Mk3QzDaiuvt
kvk6DjQzW4yh3f/sR6IoL6/cwKbqUmMlyWq3DCZxXEtTt33HotHCGxasUTMoIpai
zS5BSWf/PQbxuWbGpJVJ7+3XhUmzRDj3ANvlzuSOCh7gkwhh9W8kMYvWY8U3MHoM
yWnVD9uT2c9y4BlVZ1l5vr2eIzC+U+xr/u+s9cUq5Ws+QIK6Fg0VnwZ3iuXfYLBQ
vnFAJxVrUrSKAMGUrIXy6xMaBqloqyd9XZSTmf2VZSlzFT/Vllx7YAJK2A6lAE43
kM57Mu3265M3s7yYaHS63hFsOBQmZkZYn8zve2dcAQKBgQDeO5SfUzShnLbgx1Ow
GpTenWqcrzV+nrg+jdDHS6rT/cF2pY05Qtz78pHIf1imqgckpyTL3J3FWLghSWNd
NqDP7gjJI4S/2ilaj2KLxN2ONgEuGwvkUQQrL1GIzegf7/zdMJUPBzqQcXm6VsKk
eDUjdCoM+lnPFZrtwLWpkBIsgQKBgQDHd1wJmRxGxMXF54hV0wIaodPgmxv3/0tU
/+NIOfpDXKsNPI73G+LKkTM4HU89zBAYLyfQ4SgNbjBSpLvhOnRBX/fakWBRiiVL
f2nQ4JX7bmBFxoX53fbO8schbantvsnKxyJO+DZTcyE5iDjgiPHNHQnubGK5PVbo
gq/DJ/nu0wKBgCNFzackK7xjBVvUB2JyNaLH1X4dCR6ZzqCPHc4kIm8XXbeZOzsV
c8HBlIYAQG/jmNKmfN6mm5wRItiVr2HCI/Ac1eQm8REKbXnkPD329zt1MubAgDiy
6zh3gDd4hxlanAX3ihEikpcOi8WZs7crJTQFYg9BRTPrN/X4mlzZcykBAoGBAMJg
nY845qZMMRLHq0M/iohbdTcm0F2fKlEdv+XtoeUtE/+lKQjD4wFV+BzR6xuklXaL
1XgnQjm8TFjs8a3tocbnd4hGLR+oyOlGs956TY4kpKq6aGrzlAVd7xGzZWoqh0kV
P2jHV2GBCzqedhbRPRmOF9SBSL+Nd/jDCfbbKSNDAoGAax9rReeK0nTFliMEWlGG
8Gx6FW/IoTkQ3cYG4wqIIZM5haB2ikRZV4Lq/VBfkUGm4Q+l8sc4frMQVCbsdG8f
myNrbjZKUIlvYkanjCn0v6ibwJh213sSVeCNJA1XCW4epMowYLG2Dk5h9Bd71Xyv
pGviHAWZz0FGvgwybUWrg+g=
-----END PRIVATE KEY-----`;
const FCM_PROJECT_ID = "hy3n26";

// Helper: base64url encode
function base64url(data) {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Helper: import RSA private key from PEM
async function importPrivateKey(pem) {
  const pemBody = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Get a short-lived OAuth2 access token using service account JWT
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: SA_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(SA_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(data.error_description || "Failed to get access token");
  return data.access_token;
}

// Send FCM notification to a single token
async function sendFCMMessage(accessToken, fcmToken, title, body) {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              requireInteraction: false,
            },
            fcm_options: { link: "https://hy3n-rider.web.app" },
          },
        },
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "FCM send failed");
  }
  return resp.json();
}

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

  // Fetch all riders with FCM tokens
  const { data: riders = [], isLoading: loadingRiders } = useQuery({
    queryKey: ["riders-with-tokens"],
    queryFn: () => firebaseClient.entities.RiderProfile.list(),
    refetchInterval: 60000,
  });

  const ridersWithTokens = riders.filter(r => r.fcm_token);

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setBody(template.body);
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) return;
    if (ridersWithTokens.length === 0) {
      setResult({ success: false, message: "No riders with push notifications enabled yet. Riders need to open the app and allow notifications first." });
      return;
    }

    setSending(true);
    setResult(null);
    setSendProgress({ sent: 0, total: ridersWithTokens.length });

    let successCount = 0;
    let failCount = 0;

    try {
      // Get OAuth access token using service account
      const accessToken = await getAccessToken();

      // Send to each rider in batches of 5
      const batchSize = 5;
      for (let i = 0; i < ridersWithTokens.length; i += batchSize) {
        const batch = ridersWithTokens.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(rider => sendFCMMessage(accessToken, rider.fcm_token, title.trim(), body.trim()))
        );
        results.forEach(r => {
          if (r.status === "fulfilled") successCount++;
          else failCount++;
        });
        setSendProgress({ sent: i + batch.length, total: ridersWithTokens.length });
      }

      // Save notification record to Firestore
      await firebaseClient.entities.PushNotification.create({
        title: title.trim(),
        body: body.trim(),
        type: selectedTemplate || "general",
        status: "sent",
        target: "all_riders",
        total_recipients: ridersWithTokens.length,
        sent_count: successCount,
        failed_count: failCount,
        created_date: new Date().toISOString(),
        sent_by: "admin",
      });

      setResult({
        success: successCount > 0,
        message: failCount === 0
          ? `✅ Notification sent to all ${successCount} rider${successCount !== 1 ? "s" : ""} successfully!`
          : `Sent to ${successCount} rider${successCount !== 1 ? "s" : ""}. ${failCount} failed (tokens may be expired).`,
        successCount,
        failCount,
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

  // Notification history
  const { data: history = [] } = useQuery({
    queryKey: ["notification-history"],
    queryFn: () => firebaseClient.entities.PushNotification.list("created_date", 20),
    refetchInterval: 30000,
  });

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
            {loadingRiders ? "..." : ridersWithTokens.length} riders with notifications enabled
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
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending {sendProgress.sent}/{sendProgress.total}...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send to All {ridersWithTokens.length} Riders</>
                )}
              </Button>

              {ridersWithTokens.length === 0 && !loadingRiders && (
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
