import React from "react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ current: null }));
const api = vi.hoisted(() => ({
  supportTickets: vi.fn(),
  saveSupportTicket: vi.fn(),
  archiveSupportTicket: vi.fn(),
  supportReplies: vi.fn(),
  sendSupportReply: vi.fn(),
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@/api/adminApi", () => ({ adminApi: api }));
vi.mock("sonner", () => ({ toast: notifications }));
vi.mock("@/api/firebaseClient", () => ({
  firebaseClient: { entities: { SupportTicket: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } } },
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useState(initial) { return hooks.current.useState(initial); },
    useEffect(effect, dependencies) { return hooks.current.useEffect(effect, dependencies); },
  };
});
import Support from "../src/pages/Support";
import SupportTicketForm from "../src/components/SupportTicketForm";
import { firebaseClient } from "@/api/firebaseClient";

// Match the existing classic-JSX Vitest harness. No DOM libraries, dependency
// installs, browser, Firebase, SMTP or native fetch are needed for these tests.
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

// Only the top-level component is executed. Stable state slots and mount effects
// allow its real event handlers and returned React elements to be tested offline.
// This intentionally does not claim to test DOM layout or React reconciliation.
function mount(Component, props = {}) {
  const state = [];
  const dependencies = [];
  const pendingEffects = [];
  let stateCursor;
  let effectCursor;
  const harness = {
    tree: null,
    useState(initial) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useEffect(effect, nextDependencies) {
      const index = effectCursor++;
      const previous = dependencies[index];
      if (!previous || !nextDependencies || nextDependencies.some((value, i) => !Object.is(value, previous[i]))) {
        dependencies[index] = nextDependencies;
        pendingEffects.push(effect);
      }
    },
    render() {
      stateCursor = 0;
      effectCursor = 0;
      hooks.current = harness;
      try { harness.tree = Component(props); }
      finally { hooks.current = null; }
      while (pendingEffects.length) pendingEffects.shift()();
      return harness.tree;
    },
  };
  harness.render();
  return harness;
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (React.isValidElement(node)) return text(node.props.children);
  return node == null || typeof node === "boolean" ? "" : String(node);
}
function button(harness, name) {
  const found = elements(harness.render()).find(node => node.type === "button" && text(node).trim() === name);
  expect(found, `Expected button ${name}`).toBeDefined();
  return found;
}
function field(harness, label) {
  const group = elements(harness.render()).find(node => node.type === "div" && React.Children.toArray(node.props.children)
    .some(child => React.isValidElement(child) && child.type === "label" && text(child) === label));
  expect(group, `Expected field ${label}`).toBeDefined();
  const input = elements(group).find(node => ["input", "textarea", "select"].includes(node.type));
  expect(input).toBeDefined();
  return input;
}
function change(harness, label, value) {
  field(harness, label).props.onChange({ target: { value } });
}
function submit(harness) {
  return elements(harness.render()).find(node => node.type === "form").props.onSubmit({ preventDefault: vi.fn() });
}
async function waitForText(harness, value) {
  await vi.waitFor(() => expect(text(harness.render())).toContain(value));
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}
const ticket = {
  id: "fixture-ticket", subject: "Synthetic payment ticket", message: "Synthetic ticket body",
  from_name: "Fixture Sender", from_phone: "0000000000", from_email: "synthetic@example.com",
  category: "website_contact", priority: "Medium", status: "Open", related_ride_id: "fixture-ride",
  created_date: "2026-11-25T00:00:00.000Z", admin_reply: "Legacy reply, not metadata",
  admin_reply_id: "fixture-reply", resolved_at: "", private_server_field: "Must not be copied",
};
const metadataKeys = ["subject", "message", "from_name", "from_phone", "from_email", "category", "priority", "status", "related_ride_id"];
const metadataFrom = data => Object.fromEntries(metadataKeys.map(key => [key, data[key]]));
async function loadedPage(data = ticket) {
  api.supportTickets.mockResolvedValueOnce({ tickets: [data] });
  const page = mount(Support);
  await waitForText(page, data.subject);
  return page;
}
function expand(page, subject = ticket.subject) {
  const row = elements(page.render()).find(node => node.props.onClick && node.type === "div" && text(node).includes(subject));
  expect(row).toBeDefined();
  row.props.onClick();
  page.render();
}

beforeEach(() => {
  vi.clearAllMocks();
  api.supportTickets.mockReset().mockResolvedValue({ tickets: [] });
  api.saveSupportTicket.mockReset().mockResolvedValue({ ticket });
  api.archiveSupportTicket.mockReset().mockResolvedValue({ deleted: true });
  vi.stubGlobal("React", React);
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Native fetch is forbidden in offline component tests"); }));
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  expect(api.sendSupportReply).not.toHaveBeenCalled();
  for (const operation of Object.values(firebaseClient.entities.SupportTicket)) expect(operation).not.toHaveBeenCalled();
  hooks.current = null;
});

describe("protected Support page loading and metadata actions", () => {
  it("shows an explicit load failure instead of claiming the support list is empty", async () => {
    api.supportTickets.mockRejectedValueOnce(new Error("Administrator access denied"));
    const page = mount(Support);
    await waitForText(page, "Administrator access denied");
    expect(elements(page.tree).find(node => node.props.role === "alert")).toBeDefined();
    expect(text(page.tree)).not.toContain("No tickets found");
    expect(button(page, "Retry loading tickets")).toBeDefined();
    expect(api.supportTickets).toHaveBeenCalledTimes(1);
  });

  it("uses a safe fallback message when ticket loading fails without a message", async () => {
    api.supportTickets.mockRejectedValueOnce({});
    const page = mount(Support);
    await waitForText(page, "Support tickets could not be refreshed.");
    expect(text(page.tree)).not.toContain("No tickets found");
  });

  it("clears the failure while retrying and then renders the protected server ticket list", async () => {
    api.supportTickets.mockRejectedValueOnce(new Error("Synthetic list failure"));
    const page = mount(Support);
    await waitForText(page, "Synthetic list failure");
    const pending = deferred();
    api.supportTickets.mockReturnValueOnce(pending.promise);
    const retry = button(page, "Retry loading tickets").props.onClick();
    expect(text(page.render())).not.toContain("Synthetic list failure");
    expect(text(page.tree)).not.toContain("No tickets found");
    pending.resolve({ tickets: [ticket] });
    await retry;
    await waitForText(page, ticket.subject);
    expect(text(page.tree)).toContain("website_contact");
    expect(elements(page.tree).some(node => node.props.role === "alert")).toBe(false);
    expect(api.supportTickets).toHaveBeenCalledTimes(2);
  });

  it("keeps Retry available after another failure and shows empty only after a successful empty response", async () => {
    api.supportTickets.mockRejectedValueOnce(new Error("First load failed")).mockRejectedValueOnce(new Error("Retry load failed"));
    const page = mount(Support);
    await waitForText(page, "First load failed");
    await button(page, "Retry loading tickets").props.onClick();
    expect(text(page.render())).toContain("Retry load failed");
    expect(text(page.tree)).not.toContain("No tickets found");
    await button(page, "Retry loading tickets").props.onClick();
    expect(text(page.render())).toContain("No tickets found");
    expect(elements(page.tree).some(node => node.props.role === "alert")).toBe(false);
    expect(api.supportTickets).toHaveBeenCalledTimes(3);
  });

  it("updates status with protected metadata only and refreshes the authoritative tickets", async () => {
    const page = await loadedPage();
    expand(page);
    api.supportTickets.mockResolvedValueOnce({ tickets: [{ ...ticket, status: "Resolved" }] });
    await button(page, "Mark Resolved").props.onClick();
    expect(api.saveSupportTicket).toHaveBeenCalledWith(ticket.id, { status: "Resolved" });
    expect(api.supportTickets).toHaveBeenCalledTimes(2);
    expect(text(page.render())).toContain("website_contact");
    expect(elements(page.tree).some(node => node.type === "button" && text(node) === "Mark Resolved")).toBe(false);
  });

  it("retains the ticket and restores actions when the protected status save fails", async () => {
    const page = await loadedPage();
    expand(page);
    api.saveSupportTicket.mockRejectedValueOnce(new Error("Status save denied"));
    await button(page, "Mark Resolved").props.onClick();
    expect(notifications.error).toHaveBeenCalledWith("Status save denied");
    expect(api.supportTickets).toHaveBeenCalledTimes(1);
    expect(text(page.render())).toContain(ticket.subject);
    expect(button(page, "Mark Resolved").props.disabled).toBe(false);
  });

  it("disables competing actions while a metadata save is pending", async () => {
    const page = await loadedPage();
    expand(page);
    const pending = deferred();
    api.saveSupportTicket.mockReturnValueOnce(pending.promise);
    const saving = button(page, "Start Working").props.onClick();
    expect(button(page, "Archive").props.disabled).toBe(true);
    expect(button(page, "Edit").props.disabled).toBe(true);
    await button(page, "Close Ticket").props.onClick();
    expect(api.saveSupportTicket).toHaveBeenCalledTimes(1);
    pending.resolve({ ticket: { ...ticket, status: "In Progress" } });
    await saving;
  });

  it("does not archive when the administrator cancels the retention-aware confirmation", async () => {
    const page = await loadedPage();
    expand(page);
    confirm.mockReturnValueOnce(false);
    await button(page, "Archive").props.onClick();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("reply history is retained"));
    expect(api.archiveSupportTicket).not.toHaveBeenCalled();
    expect(api.supportTickets).toHaveBeenCalledTimes(1);
    expect(text(page.render())).toContain(ticket.subject);
  });

  it("archives through the protected API and refreshes the server list instead of direct deletion", async () => {
    const page = await loadedPage();
    expand(page);
    await button(page, "Archive").props.onClick();
    expect(api.archiveSupportTicket).toHaveBeenCalledWith(ticket.id);
    expect(api.supportTickets).toHaveBeenCalledTimes(2);
    expect(text(page.render())).toContain("No tickets found");
    expect(text(page.tree)).not.toContain(ticket.subject);
  });

  it("retains the ticket and re-enables archive after a protected archive failure", async () => {
    const page = await loadedPage();
    expand(page);
    api.archiveSupportTicket.mockRejectedValueOnce(new Error("Archive denied"));
    await button(page, "Archive").props.onClick();
    expect(notifications.error).toHaveBeenCalledWith("Archive denied");
    expect(api.supportTickets).toHaveBeenCalledTimes(1);
    expect(text(page.render())).toContain(ticket.subject);
    expect(button(page, "Archive").props.disabled).toBe(false);
  });

  it("shows a retryable refresh failure after a successful metadata write", async () => {
    const page = await loadedPage();
    expand(page);
    api.supportTickets.mockRejectedValueOnce(new Error("Post-save refresh failed"));
    await button(page, "Mark Resolved").props.onClick();
    expect(text(page.render())).toContain("Post-save refresh failed");
    expect(button(page, "Retry loading tickets")).toBeDefined();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it("keeps the actual form and all typed input open after failed creation, then closes only after a successful retry", async () => {
    const page = mount(Support);
    await waitForText(page, "No tickets found");
    button(page, "New Ticket").props.onClick();
    const formNode = elements(page.render()).find(node => node.type === SupportTicketForm);
    const form = mount(SupportTicketForm, formNode.props);
    change(form, "Subject", "Retained new subject");
    change(form, "Message *", "Retained new message");
    change(form, "From Name", "Synthetic Sender");
    api.saveSupportTicket.mockRejectedValueOnce(new Error("Creation denied"));
    await submit(form);
    expect(elements(page.render()).some(node => node.type === SupportTicketForm)).toBe(true);
    expect(field(form, "Subject").props.value).toBe("Retained new subject");
    expect(field(form, "Message *").props.value).toBe("Retained new message");
    expect(text(form.tree)).toContain("Creation denied");
    expect(api.supportTickets).toHaveBeenCalledTimes(1);
    await submit(form);
    expect(elements(page.render()).some(node => node.type === SupportTicketForm)).toBe(false);
    expect(api.supportTickets).toHaveBeenCalledTimes(2);
  });
});

describe("Support metadata form save safety and category retention", () => {
  it("submits only the editable metadata whitelist, never admin_reply or server-owned fields", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const form = mount(SupportTicketForm, { ticket, onSaved, onClose });
    change(form, "Subject", "Edited synthetic subject");
    await submit(form);
    expect(api.saveSupportTicket).toHaveBeenCalledWith(ticket.id, { ...metadataFrom(ticket), subject: "Edited synthetic subject" });
    const sent = api.saveSupportTicket.mock.calls[0][1];
    expect(Object.keys(sent).sort()).toEqual([...metadataKeys].sort());
    for (const key of ["admin_reply", "admin_reply_id", "id", "created_date", "resolved_at", "private_server_field"]) expect(sent).not.toHaveProperty(key);
    expect(text(form.render())).not.toContain(ticket.admin_reply);
    expect(text(form.tree)).toContain("Saving updates this ticket only");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("creates a new ticket with protected save and safe metadata defaults", async () => {
    const form = mount(SupportTicketForm, { onSaved: vi.fn(), onClose: vi.fn() });
    change(form, "Subject", "New synthetic subject");
    change(form, "Message *", "New synthetic message");
    change(form, "From Name", "Synthetic Sender");
    await submit(form);
    expect(api.saveSupportTicket).toHaveBeenCalledWith(undefined, {
      subject: "New synthetic subject", message: "New synthetic message", from_name: "Synthetic Sender",
      from_phone: "", from_email: "", related_ride_id: "", category: "Other", priority: "Medium", status: "Open",
    });
  });

  it("preserves every edited input and the open form on failed save, then retries identical metadata", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const form = mount(SupportTicketForm, { ticket, onSaved, onClose });
    const edits = {
      Subject: "Retained subject", "Message *": "Retained multiline\nmessage", "From Name": "Retained Sender",
      Phone: "1111111111", Email: "retained@example.com", "Related Ride ID": "retained-ride",
      Category: "Safety", Priority: "Urgent", Status: "In Progress",
    };
    for (const [label, value] of Object.entries(edits)) change(form, label, value);
    api.saveSupportTicket.mockRejectedValueOnce(new Error("Synthetic save failure"));
    await submit(form);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(elements(form.render()).find(node => node.props.role === "alert")).toBeDefined();
    expect(text(form.tree)).toContain("Synthetic save failure");
    for (const [label, value] of Object.entries(edits)) expect(field(form, label).props.value).toBe(value);
    expect(button(form, "Save Ticket").props.disabled).toBe(false);
    const firstPayload = api.saveSupportTicket.mock.calls[0][1];
    await submit(form);
    expect(api.saveSupportTicket).toHaveBeenNthCalledWith(2, ticket.id, firstPayload);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(elements(form.render()).some(node => node.props.role === "alert")).toBe(false);
  });

  it("retains changes and uses the fallback error for a failed save without a message", async () => {
    const onSaved = vi.fn();
    const form = mount(SupportTicketForm, { ticket, onSaved, onClose: vi.fn() });
    change(form, "Subject", "Retained fallback subject");
    api.saveSupportTicket.mockRejectedValueOnce({});
    await submit(form);
    expect(text(form.render())).toContain("Ticket could not be saved. Your changes are retained.");
    expect(field(form, "Subject").props.value).toBe("Retained fallback subject");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("disables Save Ticket and ignores duplicate submissions while the save is pending", async () => {
    const onSaved = vi.fn();
    const form = mount(SupportTicketForm, { ticket, onSaved, onClose: vi.fn() });
    const pending = deferred();
    api.saveSupportTicket.mockReturnValueOnce(pending.promise);
    const saving = submit(form);
    expect(button(form, "Saving...").props.disabled).toBe(true);
    await submit(form);
    expect(api.saveSupportTicket).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    pending.resolve({ ticket });
    await saving;
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(button(form, "Save Ticket").props.disabled).toBe(false);
  });

  it.each(["website_contact", "website_application", "legacy_custom_category"])("retains category %s in the select options and metadata when editing another field", async (category) => {
    const form = mount(SupportTicketForm, { ticket: { ...ticket, category }, onSaved: vi.fn(), onClose: vi.fn() });
    const select = field(form, "Category");
    expect(select.props.value).toBe(category);
    const options = elements(select).filter(node => node.type === "option").map(node => node.props.value);
    expect(options).toContain(category);
    expect(options.filter(value => value === category)).toHaveLength(1);
    change(form, "Subject", "Category must survive unrelated edit");
    await submit(form);
    expect(api.saveSupportTicket.mock.calls[0][1].category).toBe(category);
    expect(api.saveSupportTicket.mock.calls[0][1]).not.toHaveProperty("admin_reply");
  });
});
