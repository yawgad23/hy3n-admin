import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { firebaseClient, onAuthStateChange } from "@/api/firebaseClient";
import { adminApi } from "@/api/adminApi";
import { AlertTriangle, LogOut, Shield } from "lucide-react";
import AdminAccessCodeGate from "@/components/AdminAccessCodeGate";

/**
 * The trusted Cloud Run API verifies the signed Firebase ID token and the
 * server-side administrator record, then a short-lived server-signed access
 * code proof. Neither factor can grant access by itself.
 */
export default function AdminGuard() {
  const [status, setStatus] = useState("loading"); // loading | code | admin | denied | unauthenticated
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    // Firebase restores a persisted sign-in asynchronously. Its observer is
    // the authoritative point at which auth.currentUser is available, so the
    // protected API never receives a premature empty token after a reload.
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!firebaseUser) {
        if (active) setStatus("unauthenticated");
        return;
      }

      if (active) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || "",
        });
      }

      try {
        const session = await adminApi.session();
        if (active) setStatus(session.accessGranted ? "admin" : "code");
      } catch {
        if (active) setStatus("denied");
      }
    });
    const requireCode = () => { if (active) setStatus("code"); };
    window.addEventListener("hy3n:admin-access-code-required", requireCode);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("hy3n:admin-access-code-required", requireCode);
    };
  }, []);

  const handleLogout = async () => {
    sessionStorage.clear();
    adminApi.clearAccessCode();
    await firebaseClient.auth.logout("/login");
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-hy3n-bg">
        <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") return <Navigate to="/login" replace />;

  if (status === "code") {
    return <AdminAccessCodeGate verify={adminApi.verifyAccessCode} onVerified={() => setStatus("admin")} />;
  }

  if (status === "denied") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-hy3n-bg p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white font-bold text-xl">Administrator Access Required</h2>
          <p className="text-muted-foreground text-sm">
            {user?.email || "This account"} is not approved in HY3N’s protected administrator records.
          </p>
          <p className="text-muted-foreground text-xs">
            Ask an existing administrator to grant access through the server-side admin access record.
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 px-6 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition flex items-center gap-2 mx-auto"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only" aria-live="polite"><Shield /> Administrator access verified.</div>
      <Outlet />
    </>
  );
}
