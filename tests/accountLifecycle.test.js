import { describe, expect, it } from "vitest";
import {
  accountAccessLabel,
  accountLifecycleActions,
  accountLifecycleConfirmation,
} from "../src/lib/accountLifecycle";

const fixture = (accountStatus) => ({
  userId: "fixture-account",
  fullName: "Test Account",
  accountStatus,
  approvalStatus: "pending",
});

describe("administrative account access is separate from Driver verification", () => {
  it.each([
    ["active", ["suspend"]],
    ["suspended", ["release"]],
    ["inactive", ["release"]],
  ])("offers only valid actions for %s accounts", (status, ids) => {
    expect(accountLifecycleActions(status).map((action) => action.id)).toEqual(
      ids,
    );
  });
  it.each([undefined, null, "", "blocked", "unexpected"])(
    "fails closed for unknown status %s",
    (status) => {
      expect(accountLifecycleActions(status)).toEqual([]);
      expect(accountAccessLabel(status)).toContain("Unknown");
    },
  );
  it.each(["active", "suspended", "inactive"])(
    "shows an explicit account access label for %s",
    (status) => {
      expect(accountAccessLabel(status)).not.toContain("Unknown");
    },
  );
  it.each(["driver", "rider"])(
    "blocks a %s without requesting deactivation or deletion",
    (role) => {
      const account = fixture("active");
      const action = accountLifecycleActions(account.accountStatus)[0];
      expect(action.label).toBe("Block / suspend account");
      expect(action.status).toBe("suspended");
      const text = accountLifecycleConfirmation(action, account, role);
      expect(text).toContain("Records will be retained, not deleted");
      expect(text).toContain("does not request account deletion");
      expect(text).toContain("Release account");
    },
  );
  it.each(["suspended", "inactive"])(
    "release from %s does not approve a pending Driver",
    (status) => {
      const account = fixture(status);
      const action = accountLifecycleActions(status)[0];
      expect(action.status).toBe("active");
      expect(accountLifecycleConfirmation(action, account, "driver")).toContain(
        "does not change document approval",
      );
      expect(account.approvalStatus).toBe("pending");
      expect(action).not.toHaveProperty("approvalStatus");
    },
  );
  it("rejects stale actions, invalid roles and missing identifiers", () => {
    const release = accountLifecycleActions("inactive")[0];
    expect(() =>
      accountLifecycleConfirmation(release, fixture("active"), "driver"),
    ).toThrow("Refresh");
    expect(() =>
      accountLifecycleConfirmation(release, fixture("inactive"), "admin"),
    ).toThrow("Refresh");
    expect(() =>
      accountLifecycleConfirmation(
        release,
        { accountStatus: "inactive" },
        "rider",
      ),
    ).toThrow("Refresh");
  });
  it("never treats deactivation as an access-block action", () => {
    expect(() =>
      accountLifecycleConfirmation(
        { id: "suspend", status: "inactive" },
        fixture("active"),
        "driver",
      ),
    ).toThrow("Refresh");
  });
});
