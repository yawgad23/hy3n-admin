import { auth } from "@/api/firebaseClient";

const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_BASE_URL || "https://api-yvurtipaxq-ew.a.run.app"
).replace(/\/$/, "");
const ACCESS_PROOF_KEY = "hy3n_admin_access_proof";

function accessProof() {
  return sessionStorage.getItem(ACCESS_PROOF_KEY) || "";
}

function clearAccessProof() {
  sessionStorage.removeItem(ACCESS_PROOF_KEY);
}

async function request(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with an administrator account first.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(accessProof() ? { "X-HY3N-Admin-Access": accessProof() } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.code === "ADMIN_ACCESS_CODE_REQUIRED") {
      clearAccessProof();
      window.dispatchEvent(new Event("hy3n:admin-access-code-required"));
    }
    throw new Error(body.error || "The administrator request could not be completed.");
  }
  return body;
}

export const adminApi = {
  session() {
    return request("/api/admin/session");
  },

  async verifyAccessCode(accessCode) {
    const result = await request("/api/admin/access-code/verify", {
      method: "POST",
      body: JSON.stringify({ accessCode }),
    });
    if (!result.accessProof) throw new Error("The administrator access code could not be verified.");
    sessionStorage.setItem(ACCESS_PROOF_KEY, result.accessProof);
    return result;
  },

  clearAccessCode() {
    clearAccessProof();
  },

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

  deactivateAccount(userId, role) {
    return request(`/api/admin/accounts/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ role, status: "inactive" }),
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

  settings() {
    return request("/api/admin/settings");
  },

  updatePlatformFee(serviceType, amount) {
    return request(`/api/admin/settings/platform-fees/${encodeURIComponent(serviceType)}`, {
      method: "PUT",
      body: JSON.stringify({ amount }),
    });
  },

  listAdministratorAccess() {
    return request("/api/admin/access");
  },

  updateAdministratorAccess(email, payload) {
    return request(`/api/admin/access/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  liveRides() {
    return request("/api/admin/rides/live");
  },

  notifications() {
    return request("/api/admin/notifications");
  },

  broadcastNotification(payload) {
    return request("/api/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
