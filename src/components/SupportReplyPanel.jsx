import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { adminApi } from "@/api/adminApi";
import { supportReplyLabels } from "@/lib/supportReplyFlow";
import { toast } from "sonner";

export default function SupportReplyPanel({ ticket, draft, onDraftChange, flow, onAccepted }) {
  const [history, setHistory] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const refreshSequence = useRef(0);
  useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);
  const requestState = flow.state(ticket.id);
  const busy = requestState.busy;
  const pending = history.some(reply => ["sending", "unknown"].includes(reply.state));
  const validRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticket.from_email || "");

  const remember = (reply) => {
    if (!reply) return;
    setHistory(previous => [...previous.filter(item => item.id !== reply.id), reply]
      .sort((a, b) => a.created_date.localeCompare(b.created_date)));
  };
  const refresh = async (signal) => {
    const sequence = ++refreshSequence.current;
    setLoading(true);
    try {
      const result = await adminApi.supportReplies(ticket.id, { signal });
      if (!mounted.current || signal?.aborted || sequence !== refreshSequence.current) return;
      const replies = result.replies || [];
      setHistory(replies);
      setConfigured(result.emailConfigured === true);
      setError("");
      const reconciled = flow.reconcile(ticket.id, replies);
      if (reconciled?.state === "accepted") {
        onDraftChange("");
        onAccepted();
      }
    } catch (failure) {
      if (mounted.current && !signal?.aborted && sequence === refreshSequence.current) {
        setError(failure.message || "Reply history is unavailable. Refresh before sending.");
        setConfigured(false);
      }
    } finally {
      if (mounted.current && !signal?.aborted && sequence === refreshSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    refresh(controller.signal);
    return () => { mounted.current = false; controller.abort(); };
  }, [ticket.id]);

  const send = async () => {
    if (requestState.busy || loading || pending || !configured || !validRecipient) return;
    setError("");
    try {
      const result = await flow.send(ticket.id, draft);
      if (!result) return;
      if (result.reply.state === "accepted") {
        // Clear only after an authoritative SMTP-acceptance result, not after
        // saving text, a network timeout, or closing the ticket card.
        onDraftChange("");
        toast.success("Email accepted for sending");
        onAccepted();
      }
      if (mounted.current) {
        remember(result.reply);
        if (result.reply.state !== "accepted") setError(supportReplyLabels[result.reply.state]);
      }
    } catch (failure) {
      toast.error(failure.message || "Sending could not be confirmed. Your draft is retained.");
      if (mounted.current) {
        remember(failure.reply);
        setError(failure.message || "Sending could not be confirmed. Refresh reply history.");
      }
    }
  };

  return (
    <section className="space-y-3" aria-label="Email replies">
      {ticket.admin_reply && !ticket.admin_reply_id && (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Previously saved reply — email sending not confirmed</p>
          <p className="text-white text-sm whitespace-pre-wrap break-words">{ticket.admin_reply}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-white">Reply history</h2>
        <button type="button" onClick={() => refresh()} disabled={loading || busy || requestState.busy}
          className="text-xs text-hy3n-gold hover:underline disabled:opacity-50">{loading ? "Checking…" : "Refresh status"}</button>
      </div>
      {history.map(reply => (
        <div key={reply.id} className="bg-hy3n-gold/5 border border-hy3n-gold/20 rounded-xl p-4 space-y-1">
          <p className={`text-xs font-medium ${reply.state === "accepted" ? "text-hy3n-green" : "text-hy3n-gold"}`}>
            {supportReplyLabels[reply.state] || "Send outcome not confirmed"}
          </p>
          <p className="text-xs text-muted-foreground break-all">{reply.author} · {new Date(reply.created_date).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground break-all">To: {reply.recipient}</p>
          <p className="text-white text-sm whitespace-pre-wrap break-words">{reply.message}</p>
        </div>
      ))}
      {!loading && !history.length && !error && <p className="text-xs text-muted-foreground">No email replies yet.</p>}
      <div className="space-y-2">
        <label htmlFor={`support-reply-${ticket.id}`} className="block text-xs text-muted-foreground font-medium">Reply by email</label>
        <p className="text-xs text-muted-foreground break-all">From: HY3N &lt;hello@ridehy3n.com&gt;<br />To: {ticket.from_email || "No email address on this ticket"}</p>
        {!loading && !configured && <p className="text-xs text-hy3n-gold">Sending is unavailable until the HY3N support mailbox is configured on the server.</p>}
        {!validRecipient && <p className="text-xs text-hy3n-gold">Add a valid contact email using Edit before replying.</p>}
        {pending && <p className="text-xs text-hy3n-gold">An earlier send is unconfirmed. Refresh status; if it remains unknown, verify the mailbox before any follow-up. Automatic resending is blocked.</p>}
        <textarea id={`support-reply-${ticket.id}`} value={draft} maxLength={5000} rows={4}
          disabled={busy || requestState.busy || !!requestState.request}
          onChange={event => onDraftChange(event.target.value)} placeholder="Type your reply…"
          className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60 resize-y disabled:opacity-60" />
        <p className="text-xs text-muted-foreground">{draft.length}/5,000 characters. Acceptance confirms the mail server accepted the email, not that it reached the inbox.</p>
        {error && <p role="alert" className="text-xs text-hy3n-gold break-words">{error}</p>}
        <button type="button" onClick={send}
          disabled={busy || requestState.busy || loading || pending || requestState.needsCheck || !configured || !validRecipient || !draft.trim()}
          className="text-xs bg-hy3n-gold hover:bg-hy3n-gold/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {busy || requestState.busy ? "Sending…" : "Send Reply"}
        </button>
      </div>
    </section>
  );
}
