export const supportReplyLabels = {
  accepted: "Email accepted for sending",
  sending: "Sending — refresh to check",
  failed: "Not sent",
  unknown: "Send outcome unknown — check mailbox before retrying",
};

// Owned by the Support page, not the collapsible card: requests survive switching
// tickets. No drafts or contact details are saved to browser storage.
export function createSupportReplyFlow(api, newId = () => crypto.randomUUID()) {
  const tickets = new Map();
  const listeners = new Set();
  let version = 0;
  const changed = () => { version += 1; listeners.forEach(listener => listener()); };
  const entry = (id) => {
    if (!tickets.has(id)) tickets.set(id, { busy: false, request: null, needsCheck: false });
    return tickets.get(id);
  };
  const finish = (state, reply) => {
    if (reply?.state === "accepted" || reply?.state === "failed") {
      state.request = null;
      state.needsCheck = false;
    } else {
      state.needsCheck = true;
    }
    changed();
  };
  return {
    state: entry,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot() { return version; },
    reconcile(id, replies) {
      const state = entry(id);
      if (state.busy || !state.request) return null;
      const reply = replies.find(item => item.request_id === state.request.requestId);
      if (reply) finish(state, reply);
      // An empty history is not permission to invent a new key: an earlier
      // request might still arrive at the server. Retry only the same request.
      else { state.needsCheck = false; changed(); }
      return reply || null;
    },
    async send(id, rawMessage) {
      const state = entry(id);
      if (state.busy) return null;
      if (state.needsCheck) throw new Error("Refresh reply history before retrying this send.");
      const message = rawMessage.trim();
      if (!message || message.length > 5000) throw new Error("Enter a reply of up to 5,000 characters.");
      if (state.request && state.request.message !== message) {
        throw new Error("Check the previous send before changing this draft.");
      }
      state.request ||= { message, requestId: newId() };
      state.busy = true;
      changed();
      try {
        const result = await api.sendSupportReply(id, message, state.request.requestId);
        if (!result?.reply || !supportReplyLabels[result.reply.state]) {
          throw new Error("Sending could not be confirmed. Refresh reply history.");
        }
        finish(state, result.reply);
        return result;
      } catch (error) {
        if (error.reply?.state === "failed") finish(state, error.reply);
        else state.needsCheck = true;
        throw error;
      } finally {
        state.busy = false;
        changed();
      }
    },
  };
}
