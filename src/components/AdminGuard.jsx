import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { firebaseClient } from "@/api/firebaseClient";
import { Shield, Lock, Eye, EyeOff, AlertTriangle, LogOut } from "lucide-react";

// ============================================================
// ADMIN SECURITY CONFIGURATION
// Secrets are loaded from environment variables (VITE_* prefix)
// Set them in your .env file or Base44 project environment settings
// ============================================================
const FALLBACK_MASTER_CODE = "Admin1912";

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || "yawgad23@gmail.com,hy3ntransportservices@gmail.com")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
// ============================================================

export default function AdminGuard() {
  const [status, setStatus] = useState("loading"); // loading | needs_code | admin | denied | unauthenticated
  const [user, setUser] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [masterCode, setMasterCode] = useState(FALLBACK_MASTER_CODE);
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const authed = await firebaseClient.auth.isAuthenticated();
      if (!authed) { setStatus("unauthenticated"); return; }

      const currentUser = await firebaseClient.auth.me();
      setUser(currentUser);
      const email = currentUser?.email?.toLowerCase();

      // Load master code from Firestore (AppConfig)
      try {
        const configs = await firebaseClient.entities.AppConfig.filter({ key: "master_access_code" });
        if (configs.length > 0 && configs[0].value) setMasterCode(configs[0].value);
      } catch (e) { /* use fallback */ }

      // Check if user's email is in super admin list
      if (SUPER_ADMIN_EMAILS.includes(email)) {
        if (sessionStorage.getItem(`admin_verified_${email}`) === "true") {
          setStatus("admin");
        } else {
          setStatus("needs_code");
        }
        return;
      }

      // Check whitelist
      try {
        const records = await firebaseClient.entities.AdminAccess.filter({ email: email });
        if (records.length > 0 && records[0].is_active) {
          setAdminRecord(records[0]);
          if (sessionStorage.getItem(`admin_verified_${email}`) === "true") {
            setStatus("admin");
          } else {
            setStatus("needs_code");
          }
          return;
        }
      } catch (e) { /* fall through */ }

      setStatus("denied");
    } catch (e) {
      setStatus("unauthenticated");
    }
  };

  const verifyCode = () => {
    if (locked) return;
    setCodeError("");

    // Check personal code first, then master code
    const personalCode = adminRecord?.access_code;
    
    // If it's a super admin, they can use the master code
    // If it's a regular admin, they use hy3n1912 or their personal code
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user?.email?.toLowerCase());
    const validCode = isSuperAdmin ? masterCode : (personalCode || "hy3n1912");

    if (accessCode === validCode) {
      const email = user?.email?.toLowerCase();
      sessionStorage.setItem(`admin_verified_${email}`, "true");
      setStatus("admin");
      setAttempts(0);
      updateLastLogin(email);
      return;
    }

    // Wrong code
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= 5) {
      setLocked(true);
      setCodeError("Too many failed attempts. Locked for 30 minutes.");
      setTimeout(() => { setLocked(false); setAttempts(0); }, 30 * 60 * 1000);
    } else {
      setCodeError(`Invalid access code. ${5 - newAttempts} attempts remaining.`);
    }
    setAccessCode("");
  };

  const updateLastLogin = async (email) => {
    try {
      const records = await firebaseClient.entities.AdminAccess.filter({ email });
      if (records.length > 0) {
        await firebaseClient.entities.AdminAccess.update(records[0].id, {
          last_login: new Date().toISOString()
        });
      }
    } catch (e) {}
  };

  const handleLogout = () => {
    sessionStorage.clear();
    firebaseClient.auth.logout("/login");
  };

  // Loading state
  if (status === "loading") return (
    <div className="fixed inset-0 flex items-center justify-center bg-hy3n-bg">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  // Not logged in
  if (status === "unauthenticated") return <Navigate to="/login" replace />;

  // Access denied - not in whitelist
  if (status === "denied") return (
    <div className="fixed inset-0 flex items-center justify-center bg-hy3n-bg p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-white font-bold text-xl">Access Denied</h2>
        <p className="text-muted-foreground text-sm">
          Your account <span className="text-white font-medium">({user?.email})</span> is not authorized to access the admin dashboard.
        </p>
        <p className="text-muted-foreground text-xs">
          If you believe this is an error, contact the system administrator to be added to the access list.
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

  // Needs access code verification
  if (status === "needs_code") return (
    <div className="fixed inset-0 flex items-center justify-center bg-hy3n-bg p-6">
      <div className="w-full max-w-md bg-hy3n-surface border border-hy3n-border rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-hy3n-gold/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-hy3n-gold" />
          </div>
          <div className="text-center">
            <h2 className="font-bold text-xl text-white">Admin Verification</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your admin access code to continue
            </p>
          </div>
        </div>

        {/* Code input */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type={showCode ? "text" : "password"}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
              placeholder="Enter access code"
              disabled={locked}
              className="w-full px-4 py-3 bg-hy3n-bg border border-hy3n-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-hy3n-gold disabled:opacity-50 transition"
            />
            <button
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {codeError && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {codeError}
            </p>
          )}

          <button
            onClick={verifyCode}
            disabled={locked || !accessCode}
            className="w-full py-3 bg-hy3n-gold text-black font-semibold rounded-xl hover:bg-hy3n-gold/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locked ? "Locked" : "Verify Access"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-hy3n-border flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {user?.email}
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  // Fully verified - render admin content
  return <Outlet />;
}
