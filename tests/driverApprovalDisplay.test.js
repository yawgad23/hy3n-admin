import { describe, expect, it } from "vitest";
import { driverApprovalDisplay, driverMatchesStatus } from "../src/lib/driverApprovalDisplay";

describe("manual Driver approval display", () => {
  it.each(["active", "inactive", "suspended", undefined])("never shows an unapproved %s account as Active", (accountStatus) => {
    const display = driverApprovalDisplay({ accountStatus, approvalStatus: "pending" });
    expect(display.label).toBe("Awaiting approval");
    expect(display.decisionRequired).toBe(true);
    expect(display.tone).toBe("pending");
  });
  it.each([undefined, "", "active", "APPROVED", true])("treats unknown or malformed approval %s as pending", (approvalStatus) => {
    expect(driverApprovalDisplay({ accountStatus: "active", approvalStatus }).label).toBe("Awaiting approval");
  });
  it("shows rejected even when the login account is enabled", () => {
    expect(driverApprovalDisplay({ accountStatus: "active", approvalStatus: "rejected" })).toEqual({ status: "rejected", label: "Rejected", decisionRequired: true, tone: "rejected" });
  });
  it("shows manual approval explicitly rather than implying a live online state", () => {
    expect(driverApprovalDisplay({ accountStatus: "active", approvalStatus: "approved", isOnline: false }).label).toBe("Approved Driver");
  });
  it.each(["pending", "rejected", undefined])("excludes %s Drivers from the approved-and-enabled filter", (approvalStatus) => {
    expect(driverMatchesStatus({ accountStatus: "active", approvalStatus }, "active")).toBe(false);
  });
  it("includes only an approved and enabled Driver in that filter", () => {
    expect(driverMatchesStatus({ accountStatus: "active", approvalStatus: "approved" }, "active")).toBe(true);
    expect(driverMatchesStatus({ accountStatus: "inactive", approvalStatus: "approved" }, "active")).toBe(false);
  });
  it("keeps awaiting approval and lifecycle filters distinct", () => {
    const driver = { accountStatus: "suspended", approvalStatus: "pending" };
    expect(driverMatchesStatus(driver, "pending")).toBe(true);
    expect(driverMatchesStatus(driver, "suspended")).toBe(true);
    expect(driverMatchesStatus(driver, "approved")).toBe(false);
    expect(driverMatchesStatus(driver, "all")).toBe(true);
  });
});
