import { describe, expect, it, vi } from "vitest";
import { createSupportReplyFlow, supportReplyLabels } from "../src/lib/supportReplyFlow";

const key1 = "00000000-0000-4000-8000-000000000001";
const record = (state, requestId = key1) => ({ id: "fixture-reply", request_id: requestId, state, created_date: "2026-11-26T00:00:00Z" });
function setup(send = async () => ({ reply: record("accepted") })) {
  const api = { sendSupportReply: vi.fn(send) };
  const newId = vi.fn().mockReturnValueOnce(key1).mockReturnValue("00000000-0000-4000-8000-000000000002");
  return { api, newId, flow: createSupportReplyFlow(api, newId) };
}

describe("safe dashboard support reply flow", () => {
  it("awaits the server before recognizing acceptance and prevents rapid double clicks", async () => {
    let complete;
    const { flow, api } = setup(() => new Promise(resolve => { complete = resolve; }));
    const pending = flow.send("ticket", "  Fixture reply  ");
    expect(flow.state("ticket").busy).toBe(true);
    expect(flow.state("ticket").request.message).toBe("Fixture reply");
    expect(await flow.send("ticket", "Fixture reply")).toBeNull();
    expect(api.sendSupportReply).toHaveBeenCalledTimes(1);
    complete({ reply: record("accepted") });
    expect((await pending).reply.state).toBe("accepted");
    expect(flow.state("ticket")).toEqual({ busy: false, request: null, needsCheck: false });
  });
  it("never creates a new request key after a lost response or empty history", async () => {
    const { flow, api, newId } = setup(async () => { throw new Error("Network interrupted"); });
    await expect(flow.send("ticket", "Keep my draft")).rejects.toThrow("Network interrupted");
    expect(flow.state("ticket").request.message).toBe("Keep my draft");
    expect(flow.state("ticket").needsCheck).toBe(true);
    await expect(flow.send("ticket", "Keep my draft")).rejects.toThrow("Refresh");
    expect(api.sendSupportReply).toHaveBeenCalledTimes(1);
    flow.reconcile("ticket", []);
    await expect(flow.send("ticket", "Changed draft")).rejects.toThrow("previous send");
    api.sendSupportReply.mockResolvedValueOnce({ reply: record("accepted") });
    await flow.send("ticket", "Keep my draft");
    expect(api.sendSupportReply.mock.calls.map(call => call[2])).toEqual([key1, key1]);
    expect(newId).toHaveBeenCalledTimes(1);
  });
  it("recognizes acceptance from history after switching or reopening a card", async () => {
    const { flow } = setup(async () => { throw new Error("Response lost"); });
    await expect(flow.send("ticket", "Retained")).rejects.toThrow();
    expect(flow.reconcile("ticket", [record("accepted")]).state).toBe("accepted");
    expect(flow.state("ticket").request).toBeNull();
  });
  it.each(["sending", "unknown"])("does not blindly resend a %s result", async state => {
    const { flow, api } = setup(async () => ({ reply: record(state) }));
    await flow.send("ticket", "Retained");
    expect(flow.state("ticket").needsCheck).toBe(true);
    flow.reconcile("ticket", [record(state)]);
    await expect(flow.send("ticket", "Retained")).rejects.toThrow("Refresh");
    expect(api.sendSupportReply).toHaveBeenCalledTimes(1);
    expect(flow.state("ticket").request.message).toBe("Retained");
  });
  it("permits an explicit fresh attempt only after a confirmed failure", async () => {
    const failure = Object.assign(new Error("Not sent"), { reply: record("failed") });
    const { flow, api } = setup(async () => { throw failure; });
    await expect(flow.send("ticket", "Retained")).rejects.toThrow("Not sent");
    expect(flow.state("ticket").request).toBeNull();
    api.sendSupportReply.mockResolvedValueOnce({ reply: record("accepted", "00000000-0000-4000-8000-000000000002") });
    await flow.send("ticket", "Retained");
    expect(api.sendSupportReply.mock.calls[0][2]).not.toBe(api.sendSupportReply.mock.calls[1][2]);
  });
  it("releases a failed key found by refresh, without calling SMTP again", async () => {
    const { flow, api } = setup(async () => { throw new Error("Lost"); });
    await expect(flow.send("ticket", "Retained")).rejects.toThrow();
    expect(flow.reconcile("ticket", [record("failed")]).state).toBe("failed");
    expect(flow.state("ticket").needsCheck).toBe(false);
    expect(api.sendSupportReply).toHaveBeenCalledTimes(1);
  });
  it("treats malformed success responses as unconfirmed, never accepted", async () => {
    const { flow } = setup(async () => ({}));
    await expect(flow.send("ticket", "Retained")).rejects.toThrow("could not be confirmed");
    expect(flow.state("ticket").request.message).toBe("Retained");
    expect(flow.state("ticket").needsCheck).toBe(true);
  });
  it("isolates locks and request keys between different tickets", async () => {
    let complete;
    const { flow, api } = setup(id => id === "one" ? new Promise(resolve => { complete = resolve; }) : Promise.resolve({ reply: record("accepted") }));
    const pending = flow.send("one", "First");
    await flow.send("two", "Second");
    expect(flow.state("one").busy).toBe(true);
    expect(flow.state("two").busy).toBe(false);
    expect(api.sendSupportReply.mock.calls[0][2]).not.toBe(api.sendSupportReply.mock.calls[1][2]);
    complete({ reply: record("accepted") }); await pending;
  });
  it("notifies remounted UI subscribers when a pending request finishes", async () => {
    let complete;
    const { flow } = setup(() => new Promise(resolve => { complete = resolve; }));
    const pending = flow.send("ticket", "First");
    const update = vi.fn(); const unsubscribe = flow.subscribe(update);
    const version = flow.snapshot();
    complete({ reply: record("accepted") }); await pending;
    expect(flow.snapshot()).toBeGreaterThan(version);
    expect(update).toHaveBeenCalled();
    expect(flow.state("ticket").busy).toBe(false);
    unsubscribe();
  });
  it.each(["", "  ", "x".repeat(5001)])("rejects invalid draft length before the API call", async draft => {
    const { flow, api } = setup();
    await expect(flow.send("ticket", draft)).rejects.toThrow("5,000");
    expect(api.sendSupportReply).not.toHaveBeenCalled();
  });
  it("does not claim acceptance means delivery to the recipient's inbox", () => {
    expect(supportReplyLabels.accepted).toBe("Email accepted for sending");
    expect(Object.values(supportReplyLabels).join(" ")).not.toContain("Delivered");
  });
});
