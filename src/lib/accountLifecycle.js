const actions = {
  suspend: {
    id: "suspend",
    label: "Block / suspend account",
    status: "suspended",
  },
  release: { id: "release", label: "Release account", status: "active" },
};

export function accountLifecycleActions(status) {
  if (status === "active") return [actions.suspend];
  if (status === "suspended" || status === "inactive") return [actions.release];
  return [];
}

export function accountAccessLabel(status) {
  if (status === "active") return "Enabled";
  if (status === "suspended") return "Blocked / suspended";
  if (status === "inactive") return "Inactive (retained)";
  return "Unknown — refresh account";
}

export function accountLifecycleConfirmation(action, account, role) {
  if (
    !["driver", "rider"].includes(role) ||
    !account?.userId ||
    !accountLifecycleActions(account.accountStatus).some(
      (item) => item.id === action?.id && item.status === action.status,
    )
  ) {
    throw new Error("Refresh the account before changing access.");
  }
  const name =
    account.fullName || (role === "driver" ? "this Driver" : "this Rider");
  const approval =
    role === "driver"
      ? " This does not change document approval. A pending or rejected Driver still cannot take rides."
      : "";
  if (action.id === "release") {
    return `Release ${name}'s account and enable login again?${approval}`;
  }
  const consequence =
    role === "driver"
      ? "Login and Driver availability will be disabled."
      : "Login will be disabled.";
  return `Block / suspend ${name}'s account? ${consequence} Records will be retained, not deleted; this does not request account deletion. The restriction remains until you use Release account.${approval}`;
}
