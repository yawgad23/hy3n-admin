import { Link, useLocation, Outlet } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Car, Users, UserCircle, Settings,
  Menu, X, LogOut, Bell, ChevronRight, Wallet,
  MessageSquare, Radio, BarChart2, ClipboardList, DollarSign, CreditCard,
  CheckSquare, Flag, Trophy
} from "lucide-react";
import { firebaseClient } from "@/api/firebaseClient";
import AdminNotificationCenter from "@/components/AdminNotificationCenter";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/rides", label: "Rides", icon: Car },
  { path: "/drivers", label: "Drivers", icon: UserCircle },
  { path: "/riders", label: "Riders", icon: Users },
  { path: "/live", label: "Live Rides", icon: Radio },
  { path: "/commissions", label: "Commissions", icon: Wallet },
  { path: "/daily-commissions", label: "Daily Fee Review", icon: CheckSquare },
  { path: "/reports", label: "Reports & Complaints", icon: Flag },
  { path: "/notifications", label: "Send Notifications", icon: Bell },
  { path: "/support", label: "Support", icon: MessageSquare },
  { path: "/applications", label: "Applications", icon: ClipboardList },
  { path: "/payouts", label: "Payouts", icon: CreditCard },
  { path: "/pricing", label: "Pricing", icon: DollarSign },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/bonuses", label: "Driver Bonuses", icon: Trophy },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-hy3n-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-hy3n-surface border-r border-hy3n-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:flex ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-hy3n-border">
          <div className="flex items-center gap-2">
            <div className="flex items-baseline font-black text-2xl tracking-tight">
              <span className="text-white">HY</span>
              <span className="text-hy3n-red">3</span>
              <span className="text-hy3n-gold">N</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium bg-white/10 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? "bg-hy3n-gold text-black"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-hy3n-border">
          <button
            onClick={() => firebaseClient.auth.logout("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 w-full transition-all"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-hy3n-surface border-b border-hy3n-border flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowNotifCenter(true)}
            className="relative text-muted-foreground hover:text-white transition-colors"
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-hy3n-red" />
          </button>
          <AdminNotificationCenter
            isOpen={showNotifCenter}
            onClose={() => setShowNotifCenter(false)}
          />
          <div className="flex items-center gap-2 pl-3 border-l border-hy3n-border">
            <div className="w-8 h-8 rounded-full bg-hy3n-gold flex items-center justify-center text-black font-bold text-xs">
              AD
            </div>
            <span className="text-sm font-medium text-white hidden sm:block">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}