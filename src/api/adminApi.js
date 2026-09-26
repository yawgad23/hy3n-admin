import { auth } from "@/api/firebaseClient";

const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_BASE_URL || "https://api-yvurtipaxq-ew.a.run.app"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with an administrator account first.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "The administrator request could not be completed.");
  }
  return body;
}

export const adminApi = {
  listAccounts(role) {
    return request(`/api/admin/accounts?role=${encodeURIComponent(role)}`);
  },

  createAccount(payload) {
    return request("/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  setAccountStatus(userId, role, status) {
    return request(`/api/admin/accounts/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ role, status }),
    });
  },

  setDriverApproval(userId, approvalStatus, reason = "") {
    return request(`/api/admin/drivers/${encodeURIComponent(userId)}/approval`, {
      method: "PATCH",
      body: JSON.stringify({ approvalStatus, reason }),
    });
  },

  removeAccount(userId, role) {
    return request(`/api/admin/accounts/${encodeURIComponent(userId)}?role=${encodeURIComponent(role)}`, {
      method: "DELETE",
    });
  },

  driverFees(filters = {}) {
    const query = new URLSearchParams();
    if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.set("dateTo", filters.dateTo);
    if (filters.status) query.set("status", filters.status);
    const suffix = query.toString();
    return request(`/api/admin/driver-fees${suffix ? `?${suffix}` : ""}`);
  },
};
