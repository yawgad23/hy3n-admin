import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
// The existing Vitest transform uses classic JSX; production Vite uses the
// automatic React runtime. Supply React only to this isolated test harness.
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
vi.mock("@/api/adminApi", () => ({ adminApi: { supportReplies: vi.fn(), sendSupportReply: vi.fn() } }));
vi.mock("@/api/firebaseClient", () => ({ firebaseClient: { entities: { SupportTicket: {} } } }));
import SupportReplyPanel from "../src/components/SupportReplyPanel";
import SupportTicketForm from "../src/components/SupportTicketForm";
import Support from "../src/pages/Support";
import { createSupportReplyFlow } from "../src/lib/supportReplyFlow";

const ticket = { id: "fixture", subject: "Fixture", from_email: "synthetic@example.com", admin_reply: "Old saved text" };
const renderPanel = (data = ticket) => renderToStaticMarkup(React.createElement(SupportReplyPanel, {
  ticket: data, draft: "Retained draft", onDraftChange: vi.fn(), onAccepted: vi.fn(), flow: createSupportReplyFlow({}),
}));

describe("support reply web components", () => {
  it("renders legacy saved text as unconfirmed rather than sent", () => {
    const html = renderPanel();
    expect(html).toContain("Previously saved reply — email sending not confirmed");
    expect(html).toContain("Old saved text");
    expect(html).not.toContain("Delivered");
  });
  it("keeps the draft and disables sending while authoritative history is loading", () => {
    const html = renderPanel();
    expect(html).toContain("Retained draft");
    expect(html).toContain("Checking…");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Send Reply<\/button>/);
    expect(html).toMatch(/maxlength="5000"/i);
  });
  it("shows the HY3N sender and ticket recipient with safe wrapping and correct acceptance wording", () => {
    const html = renderPanel();
    expect(html).toContain("hello@ridehy3n.com");
    expect(html).toContain("synthetic@example.com");
    expect(html).toContain("break-all");
    expect(html).toContain("not that it reached the inbox");
  });
  it("does not display an accepted server reply again as a legacy draft", () => {
    expect(renderPanel({ ...ticket, admin_reply_id: "authoritative-reply" })).not.toContain("Previously saved reply");
  });
  it("explains how to correct a missing contact email before replying", () => {
    const html = renderPanel({ ...ticket, from_email: "" });
    expect(html).toContain("Add a valid contact email using Edit before replying");
  });
  it("does not expose an editable admin_reply field in the metadata form", () => {
    const html = renderToStaticMarkup(React.createElement(SupportTicketForm, { ticket, onSaved: vi.fn(), onClose: vi.fn() }));
    expect(html).not.toContain("Old saved text");
    expect(html).not.toContain("Admin Reply");
    expect(html).toContain("Saving updates this ticket only");
  });
  it("parses and renders the real Support page without production compilation", () => {
    const html = renderToStaticMarkup(React.createElement(Support));
    expect(html).toContain("Support");
    expect(html).toContain("New Ticket");
  });
});
