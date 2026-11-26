import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ currentUser: null }));
vi.mock("@/api/firebaseClient", () => ({ auth: identity }));
import { adminApi } from "../src/api/adminApi";

const ticket = { id: "fixture/ticket", subject: "Synthetic support ticket", category: "website_contact" };
const metadata = { subject: ticket.subject, category: ticket.category, status: "Open" };
const methods = [
  ["list", () => adminApi.supportTickets()],
  ["create", () => adminApi.saveSupportTicket(undefined, metadata)],
  ["update", () => adminApi.saveSupportTicket(ticket.id, { status: "Resolved" })],
  ["archive", () => adminApi.archiveSupportTicket(ticket.id)],
];
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  identity.currentUser = { getIdToken: vi.fn(async () => "fixture-token") };
  vi.stubGlobal("sessionStorage", { getItem: vi.fn(() => "fixture-proof"), removeItem: vi.fn() });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  // Every HTTP operation is synthetic: never fall through to native fetch.
  vi.stubGlobal("fetch", vi.fn(async () => response({ tickets: [ticket] })));
});
afterEach(() => vi.unstubAllGlobals());

function expectProtected(options) {
  expect(options.headers.Authorization).toBe("Bearer fixture-token");
  expect(options.headers["X-HY3N-Admin-Access"]).toBe("fixture-proof");
  expect(options.cache).toBe("no-store");
}

describe("administrator Support ticket HTTP contracts", () => {
  it("loads the protected uncached ticket list with cancellation and returns { tickets }", async () => {
    const controller = new AbortController();
    await expect(adminApi.supportTickets({ signal: controller.signal })).resolves.toEqual({ tickets: [ticket] });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/support$/);
    expect(options.method || "GET").toBe("GET");
    expect(options.signal).toBe(controller.signal);
    expect(options.body).toBeUndefined();
    expectProtected(options);
  });

  it("creates metadata using POST and returns the HTTP 201 { ticket } response", async () => {
    fetch.mockResolvedValueOnce(response({ ticket }, 201));
    await expect(adminApi.saveSupportTicket(undefined, metadata)).resolves.toEqual({ ticket });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/support$/);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual(metadata);
    expect(JSON.parse(options.body)).not.toHaveProperty("admin_reply");
    expectProtected(options);
  });

  it("updates only supplied metadata using PATCH with an encoded ticket ID and returns { ticket }", async () => {
    fetch.mockResolvedValueOnce(response({ ticket: { ...ticket, status: "Resolved" } }));
    await expect(adminApi.saveSupportTicket(ticket.id, { status: "Resolved" })).resolves.toEqual({ ticket: { ...ticket, status: "Resolved" } });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/support\/fixture%2Fticket$/);
    expect(options.method).toBe("PATCH");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ status: "Resolved" });
    expectProtected(options);
  });

  it("archives using protected DELETE without a body and returns { deleted: true }", async () => {
    fetch.mockResolvedValueOnce(response({ deleted: true }));
    await expect(adminApi.archiveSupportTicket(ticket.id)).resolves.toEqual({ deleted: true });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/support\/fixture%2Fticket$/);
    expect(options.method).toBe("DELETE");
    expect(options.body).toBeUndefined();
    expect(options.headers["Content-Type"]).toBeUndefined();
    expectProtected(options);
  });

  it.each(methods)("rejects %s before any request when the administrator is signed out", async (_name, invoke) => {
    identity.currentUser = null;
    await expect(invoke()).rejects.toThrow("Sign in with an administrator account first.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(methods)("preserves the existing access-code challenge for %s without retrying", async (_name, invoke) => {
    fetch.mockResolvedValueOnce(response({ error: "Administrator code required", code: "ADMIN_ACCESS_CODE_REQUIRED" }, 403));
    await expect(invoke()).rejects.toMatchObject({ message: "Administrator code required", code: "ADMIN_ACCESS_CODE_REQUIRED", status: 403 });
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("hy3n_admin_access_proof");
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(window.dispatchEvent.mock.calls[0][0].type).toBe("hy3n:admin-access-code-required");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(methods)("surfaces %s HTTP failures without automatic replay", async (_name, invoke) => {
    fetch.mockResolvedValueOnce(response({ error: "Support temporarily unavailable", code: "SUPPORT_UNAVAILABLE" }, 503));
    await expect(invoke()).rejects.toMatchObject({ message: "Support temporarily unavailable", code: "SUPPORT_UNAVAILABLE", status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.removeItem).not.toHaveBeenCalled();
  });

  it("cancels an already aborted list request before token refresh or fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(adminApi.supportTickets({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(identity.currentUser.getIdToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels a stalled identity refresh before starting the list request", async () => {
    identity.currentUser.getIdToken = vi.fn(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = adminApi.supportTickets({ signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
