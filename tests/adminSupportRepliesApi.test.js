import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ currentUser: { getIdToken: vi.fn(async () => "fixture-token") } }));
vi.mock("@/api/firebaseClient", () => ({ auth: identity }));
import { adminApi } from "../src/api/adminApi";

beforeEach(() => {
  identity.currentUser = { getIdToken: vi.fn(async () => "fixture-token") };
  vi.stubGlobal("sessionStorage", { getItem: vi.fn(() => "fixture-proof"), removeItem: vi.fn() });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ replies: [], emailConfigured: false }) })));
});
afterEach(() => vi.unstubAllGlobals());

describe("administrator support email API", () => {
  it("loads uncached history with identity, access-code proof and cancellation", async () => {
    const controller = new AbortController();
    await adminApi.supportReplies("fixture/ticket", { signal: controller.signal });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/api/admin/support/fixture%2Fticket/replies");
    expect(options.cache).toBe("no-store");
    expect(options.signal).toBe(controller.signal);
    expect(options.headers.Authorization).toBe("Bearer fixture-token");
    expect(options.headers["X-HY3N-Admin-Access"]).toBe("fixture-proof");
  });
  it("sends only message and stable request ID, never a client-supplied recipient or sender", async () => {
    await adminApi.sendSupportReply("fixture", "Synthetic reply", "fixture-request");
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(JSON.parse(options.body)).toEqual({ message: "Synthetic reply", requestId: "fixture-request" });
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer fixture-token");
  });
  it("preserves a definitely failed reply record for safe draft retry", async () => {
    const reply = { id: "fixture", state: "failed" };
    fetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ error: "Not sent", reply }) });
    await expect(adminApi.sendSupportReply("fixture", "Reply", "key")).rejects.toMatchObject({ message: "Not sent", status: 502, reply });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("returns unknown/sending HTTP 202 states without falsely treating them as acceptance", async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 202, json: async () => ({ reply: { state: "unknown" } }) });
    expect((await adminApi.sendSupportReply("fixture", "Reply", "key")).reply.state).toBe("unknown");
  });
  it("retains the existing administrator access-code challenge flow", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: "Code required", code: "ADMIN_ACCESS_CODE_REQUIRED" }) });
    await expect(adminApi.supportReplies("fixture")).rejects.toMatchObject({ status: 403 });
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("hy3n_admin_access_proof");
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
  });
  it("never requests email sending if the administrator is signed out", async () => {
    identity.currentUser = null;
    await expect(adminApi.sendSupportReply("fixture", "Reply", "key")).rejects.toThrow("Sign in");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not fetch history after an already cancelled request", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(adminApi.supportReplies("fixture", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
