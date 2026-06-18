import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import {
  Shield, UserPlus, Trash2, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, Copy, Eye, EyeOff, Key, Save, Lock
} from "lucide-react";

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || "yawgad23@gmail.com")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const FALLBACK_CODE = "Admin1912";

export default function Settings() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [newUserCode, setNewUserCode] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // Master code management
  const [masterCode, setMasterCode] = useState(FALLBACK_CODE);
  const [masterCodeDoc, setMasterCodeDoc] = useState(null);
  const [newMasterCode, setNewMasterCode] = useState("");
  const [confirmMasterCode, setConfirmMasterCode] = useState("");
  const [showMasterCode, setShowMasterCode] = useState(false);
  const [showNewMasterCode, setShowNewMasterCode] = useState(false);
  const [masterCodeSaving, setMasterCodeSaving] = useState(false);
  const [masterCodeMsg, setMasterCodeMsg] = useState("");

  // Per-user code editing
  const [editingCodeFor, setEditingCodeFor] = useState(null);
  const [editCodeValue, setEditCodeValue] = useState("");
  const [showEditCode, setShowEditCode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminList, user, configList] = await Promise.all([
        firebaseClient.entities.AdminAccess.list("-created_date", 100),
        firebaseClient.auth.me(),
        firebaseClient.entities.AppConfig.filter({ key: "master_access_code" }).catch(() => [])
      ]);
      setAdmins(adminList);
      setCurrentUser(user);
      if (configList.length > 0) {
        setMasterCode(configList[0].value || FALLBACK_CODE);
        setMasterCodeDoc(configList[0]);
      }
    } catch (e) {
      setAdmins([]);
    }
    setLoading(false);
  };

  const isSuperAdmin = () => SUPER_ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase());

  // ── Master code change ──────────────────────────────────────────
  const saveMasterCode = async () => {
    if (!newMasterCode.trim()) { setMasterCodeMsg("Please enter a new code."); return; }
    if (newMasterCode !== confirmMasterCode) { setMasterCodeMsg("Codes do not match."); return; }
    if (newMasterCode.length < 6) { setMasterCodeMsg("Code must be at least 6 characters."); return; }
    setMasterCodeSaving(true);
    setMasterCodeMsg("");
    try {
      if (masterCodeDoc) {
        await firebaseClient.entities.AppConfig.update(masterCodeDoc.id, {
          value: newMasterCode,
          updated_by: currentUser?.email,
          updated_at: new Date().toISOString()
        });
      } else {
        const doc = await firebaseClient.entities.AppConfig.create({
          key: "master_access_code",
          value: newMasterCode,
          updated_by: currentUser?.email,
          updated_at: new Date().toISOString()
        });
        setMasterCodeDoc(doc);
      }
      setMasterCode(newMasterCode);
      setNewMasterCode("");
      setConfirmMasterCode("");
      setMasterCodeMsg("✓ Master access code updated successfully.");
    } catch (e) {
      setMasterCodeMsg("Failed to save: " + e.message);
    }
    setMasterCodeSaving(false);
  };

  // ── Add admin ──────────────────────────────────────────────────
  const addAdmin = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    try {
      await firebaseClient.entities.AdminAccess.create({
        email: newEmail.toLowerCase().trim(),
        name: newName.trim() || newEmail.split("@")[0],
        role: newRole,
        access_code: newUserCode.trim() || null,
        is_active: true,
        created_by: currentUser?.email,
        last_login: null,
        revoked_at: null,
        revoked_by: null
      });
      setNewEmail(""); setNewName(""); setNewRole("admin"); setNewUserCode("");
      setShowAddForm(false);
      loadData();
    } catch (e) {
      alert("Failed to add admin: " + e.message);
    }
    setSaving(false);
  };

  // ── Per-user code ──────────────────────────────────────────────
  const saveUserCode = async (admin) => {
    try {
      await firebaseClient.entities.AdminAccess.update(admin.id, {
        access_code: editCodeValue.trim() || null
      });
      setEditingCodeFor(null);
      setEditCodeValue("");
      loadData();
    } catch (e) {
      alert("Failed to update code: " + e.message);
    }
  };

  const removeUserCode = async (admin) => {
    if (!confirm(`Remove the personal access code for ${admin.email}? They will use the master code.`)) return;
    try {
      await firebaseClient.entities.AdminAccess.update(admin.id, { access_code: null });
      loadData();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  // ── Revoke / restore / delete ──────────────────────────────────
  const revokeAccess = async (admin) => {
    if (!confirm(`Revoke access for ${admin.email}?`)) return;
    try {
      await firebaseClient.entities.AdminAccess.update(admin.id, {
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: currentUser?.email
      });
      loadData();
    } catch (e) { alert("Failed: " + e.message); }
  };

  const restoreAccess = async (admin) => {
    try {
      await firebaseClient.entities.AdminAccess.update(admin.id, {
        is_active: true, revoked_at: null, revoked_by: null
      });
      loadData();
    } catch (e) { alert("Failed: " + e.message); }
  };

  const deleteAdmin = async (admin) => {
    if (!confirm(`Permanently delete ${admin.email}?`)) return;
    try {
      await firebaseClient.entities.AdminAccess.delete(admin.id);
      loadData();
    } catch (e) { alert("Failed: " + e.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage admin access and security</p>
      </div>

      {/* ── Master Access Code ── */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-hy3n-gold/10">
            <Shield className="w-5 h-5 text-hy3n-gold" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Master Access Code</h2>
            <p className="text-xs text-muted-foreground">All admins use this code unless they have a personal code</p>
          </div>
        </div>

        {/* Current code display */}
        <div className="bg-hy3n-bg border border-hy3n-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current master code:</p>
            <p className="text-white font-mono font-bold text-lg tracking-wider">
              {showMasterCode ? masterCode : "•".repeat(masterCode.length)}
            </p>
          </div>
          <button
            onClick={() => setShowMasterCode(!showMasterCode)}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            {showMasterCode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Change code form — super admin only */}
        {isSuperAdmin() && (
          <div className="space-y-3 border-t border-hy3n-border pt-4">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <Lock size={14} className="text-hy3n-gold" />
              Change Master Code
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type={showNewMasterCode ? "text" : "password"}
                  value={newMasterCode}
                  onChange={(e) => setNewMasterCode(e.target.value)}
                  placeholder="New access code"
                  className="w-full px-4 py-2.5 bg-hy3n-bg border border-hy3n-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-hy3n-gold text-sm pr-10"
                />
                <button onClick={() => setShowNewMasterCode(!showNewMasterCode)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showNewMasterCode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <input
                type={showNewMasterCode ? "text" : "password"}
                value={confirmMasterCode}
                onChange={(e) => setConfirmMasterCode(e.target.value)}
                placeholder="Confirm new code"
                className="w-full px-4 py-2.5 bg-hy3n-bg border border-hy3n-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-hy3n-gold text-sm"
              />
            </div>
            {masterCodeMsg && (
              <p className={`text-sm flex items-center gap-2 ${masterCodeMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                {masterCodeMsg.startsWith("✓") ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {masterCodeMsg}
              </p>
            )}
            <button
              onClick={saveMasterCode}
              disabled={masterCodeSaving || !newMasterCode || !confirmMasterCode}
              className="px-5 py-2.5 bg-hy3n-gold text-black text-sm font-semibold rounded-xl hover:bg-hy3n-gold/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} />
              {masterCodeSaving ? "Saving..." : "Update Master Code"}
            </button>
          </div>
        )}
      </div>

      {/* ── Admin Users ── */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-hy3n-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Admin Users</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{admins.filter(a => a.is_active).length} active admins</p>
          </div>
          {isSuperAdmin() && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 bg-hy3n-gold text-black text-sm font-medium rounded-xl flex items-center gap-2 hover:bg-hy3n-gold/90 transition"
            >
              <UserPlus size={14} />
              Add Admin
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-hy3n-border bg-hy3n-bg/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email address"
                className="px-3 py-2 bg-hy3n-bg border border-hy3n-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-hy3n-gold" />
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Display name"
                className="px-3 py-2 bg-hy3n-bg border border-hy3n-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-hy3n-gold" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="px-3 py-2 bg-hy3n-bg border border-hy3n-border rounded-lg text-white text-sm focus:outline-none focus:border-hy3n-gold">
                <option value="admin">Admin</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={newUserCode} onChange={(e) => setNewUserCode(e.target.value)}
                  placeholder="Personal access code (optional)"
                  className="w-full pl-8 pr-3 py-2 bg-hy3n-bg border border-hy3n-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-hy3n-gold" />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to use master code</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addAdmin} disabled={saving || !newEmail}
                className="px-4 py-2 bg-hy3n-gold text-black text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-hy3n-gold/90 transition">
                {saving ? "Adding..." : "Add to Whitelist"}
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Super admins */}
        <div className="px-6 py-3 border-b border-hy3n-border/50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Super Admins (permanent)</p>
          {SUPER_ADMIN_EMAILS.map(email => (
            <div key={email} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-hy3n-gold/20 flex items-center justify-center">
                <Shield size={14} className="text-hy3n-gold" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{email}</p>
                <p className="text-xs text-hy3n-gold">Super Admin · uses master code</p>
              </div>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full font-medium">Active</span>
            </div>
          ))}
        </div>

        {/* Admin list */}
        <div className="divide-y divide-hy3n-border/50">
          {admins.length === 0 && (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              No additional admins yet. Click "Add Admin" to invite team members.
            </div>
          )}
          {admins.map(admin => (
            <div key={admin.id} className={`px-6 py-4 ${!admin.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${admin.is_active ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  {admin.is_active ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{admin.name || admin.email}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{admin.role} · {admin.last_login ? `Last login: ${new Date(admin.last_login).toLocaleDateString()}` : "Never logged in"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {admin.is_active ? (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">Revoked</span>
                  )}
                </div>
                {isSuperAdmin() && (
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <button
                      onClick={() => { setEditingCodeFor(admin.id); setEditCodeValue(admin.access_code || ""); setShowEditCode(false); }}
                      className="p-1.5 text-hy3n-gold hover:bg-hy3n-gold/10 rounded-lg transition"
                      title="Set personal access code"
                    >
                      <Key size={15} />
                    </button>
                    {admin.is_active ? (
                      <button onClick={() => revokeAccess(admin)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Revoke access">
                        <XCircle size={15} />
                      </button>
                    ) : (
                      <button onClick={() => restoreAccess(admin)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition" title="Restore access">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button onClick={() => deleteAdmin(admin)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Personal code badge */}
              {admin.access_code && (
                <div className="mt-2 ml-11 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-hy3n-gold/10 text-hy3n-gold text-xs rounded-full flex items-center gap-1">
                    <Key size={10} />
                    Has personal access code
                  </span>
                  {isSuperAdmin() && (
                    <button onClick={() => removeUserCode(admin)} className="text-xs text-red-400 hover:underline">Remove</button>
                  )}
                </div>
              )}

              {/* Inline code editor */}
              {editingCodeFor === admin.id && isSuperAdmin() && (
                <div className="mt-3 ml-11 flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <input
                      type={showEditCode ? "text" : "password"}
                      value={editCodeValue}
                      onChange={(e) => setEditCodeValue(e.target.value)}
                      placeholder="Enter personal code"
                      className="px-3 py-2 pr-8 bg-hy3n-bg border border-hy3n-gold/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-hy3n-gold w-52"
                    />
                    <button onClick={() => setShowEditCode(!showEditCode)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      {showEditCode ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button onClick={() => saveUserCode(admin)}
                    className="px-3 py-2 bg-hy3n-gold text-black text-xs font-semibold rounded-lg hover:bg-hy3n-gold/90 transition flex items-center gap-1">
                    <Save size={12} /> Save
                  </button>
                  <button onClick={() => setEditingCodeFor(null)}
                    className="px-3 py-2 bg-white/5 text-white text-xs rounded-lg hover:bg-white/10 transition">
                    Cancel
                  </button>
                  <p className="text-xs text-muted-foreground w-full">Leave blank to remove personal code (uses master code)</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-3">How Admin Security Works</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {[
            ["Login", "User logs in with Google or email/password"],
            ["Whitelist Check", "System verifies the user's email is in the admin whitelist"],
            ["Access Code", "User enters their personal code (if set) or the master code. Locks after 5 failed attempts for 30 minutes."],
            ["Session", "Verification is stored per browser session. Closing the browser requires re-verification."]
          ].map(([title, desc], i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-hy3n-gold/10 text-hy3n-gold flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <p><span className="text-white font-medium">{title}:</span> {desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
