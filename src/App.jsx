import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import AdminLayout from './components/AdminLayout';
import AdminGuard from './components/AdminGuard';
import Dashboard from './pages/Dashboard';
import Rides from './pages/Rides';
import Drivers from './pages/Drivers';
import Riders from './pages/Riders';
import Settings from './pages/Settings';
import Commissions from './pages/Commissions';
import Support from './pages/Support';
import LiveRides from './pages/LiveRides';
import Analytics from './pages/Analytics';
import DriverApplications from './pages/DriverApplications';
import Pricing from './pages/Pricing';
import Payouts from './pages/Payouts';
import DriverOnboarding from './pages/DriverOnboarding';
import Login from './pages/Login';
import DailyCommissions from './pages/DailyCommissions';
import RideReports from './pages/RideReports';
import SendNotifications from './pages/SendNotifications';
import DriverBonuses from './pages/DriverBonuses';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/apply" element={<DriverOnboarding />} />
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rides" element={<Rides />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/riders" element={<Riders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/daily-commissions" element={<DailyCommissions />} />
          <Route path="/reports" element={<RideReports />} />
          <Route path="/support" element={<Support />} />
          <Route path="/live" element={<LiveRides />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/applications" element={<DriverApplications />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/notifications" element={<SendNotifications />} />
          <Route path="/bonuses" element={<DriverBonuses />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App