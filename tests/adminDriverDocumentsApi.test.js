import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ currentUser: { getIdToken: vi.fn(async () => "fixture-admin-token") } }));
vi.mock("@/api/firebaseClient", () => ({ auth: identity }));
import { adminApi } from "../src/api/adminApi";

beforeEach(() => {
  identity.currentUser = { getIdToken: vi.fn(async () => "fixture-admin-token") };
  vi.stubGlobal("sessionStorage", { getItem: vi.fn(() => "fixture-proof"), removeItem: vi.fn() });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ account: { userId: "driver" } }) })));
});
afterEach(() => vi.unstubAllGlobals());

describe("admin Driver verification HTTP contract", () => {
  it("reads the exact encoded Driver UID with token, admin proof, cancellation and no cache", async () => {
    const controller = new AbortController();
    await adminApi.driverDocuments("driver/a", { signal: controller.signal });
    const [path, options] = fetch.mock.calls[0];
    expect(path).toContain("/api/admin/drivers/driver%2Fa/documents");
    expect(options.cache).toBe("no-store");
    expect(options.signal).toBe(controller.signal);
    expect(options.headers.Authorization).toBe("Bearer fixture-admin-token");
    expect(options.headers["X-HY3N-Admin-Access"]).toBe("fixture-proof");
  });
  it("aborts an already cancelled check before requesting a token or network", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(adminApi.driverDocuments("driver", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(identity.currentUser.getIdToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("aborts during a stalled token refresh without starting the document request", async () => {
    identity.currentUser.getIdToken = vi.fn(() => new Promise(() => {}));
    const controller = new AbortController();
    const request = adminApi.driverDocuments("driver", { signal: controller.signal });
    await Promise.resolve(); controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("passes the reviewed revision with a manual approval", async () => {
    await adminApi.setDriverApproval("driver", "approved", "", "a".repeat(64));
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ approvalStatus: "approved", reason: "", documentRevision: "a".repeat(64) });
  });
  it("passes the reviewed revision and rejection reason together", async () => {
    await adminApi.setDriverApproval("driver", "rejected", "Licence unreadable", "b".repeat(64));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ approvalStatus: "rejected", reason: "Licence unreadable", documentRevision: "b".repeat(64) });
  });
  it("does not retry a stale decision or swallow its structured error", async () => {
    fetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: "DOCUMENT_MANIFEST_CHANGED", error: "Application changed", missingDocuments: ["licenseBack"] }) });
    await expect(adminApi.setDriverApproval("driver", "approved", "", "a".repeat(64))).rejects.toMatchObject({ code: "DOCUMENT_MANIFEST_CHANGED", status: 409, missingDocuments: ["licenseBack"] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("fails before a network request when no administrator is signed in", async () => {
    identity.currentUser = null;
    await expect(adminApi.driverDocuments("driver")).rejects.toThrow("Sign in");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("clears an invalid access proof using the existing access-code flow", async () => {
    fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ code: "ADMIN_ACCESS_CODE_REQUIRED", error: "Code needed" }) });
    await expect(adminApi.driverDocuments("driver")).rejects.toMatchObject({ status: 403 });
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("hy3n_admin_access_proof");
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
