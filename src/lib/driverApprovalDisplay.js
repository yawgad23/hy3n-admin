// Login lifecycle and administrator approval are distinct. Never label an
// unreviewed application as Active just because its login is enabled.
export function driverApprovalDisplay(driver = {}) {
  const status = ["approved", "rejected"].includes(driver.approvalStatus)
    ? driver.approvalStatus
    : "pending";
  return {
    status,
    label:
      status === "approved"
        ? "Approved Driver"
        : status === "rejected"
          ? "Rejected"
          : "Awaiting approval",
    decisionRequired: status !== "approved",
    tone:
      status === "approved"
        ? "approved"
        : status === "rejected"
          ? "rejected"
          : "pending",
  };
}

export function driverMatchesStatus(driver, filter) {
  if (filter === "all") return true;
  const approval = driverApprovalDisplay(driver).status;
  if (filter === "active")
    return approval === "approved" && driver.accountStatus === "active";
  return ["pending", "approved", "rejected"].includes(filter)
    ? approval === filter
    : driver.accountStatus === filter;
}
