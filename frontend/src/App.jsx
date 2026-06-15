import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TwoFactorPage from './pages/TwoFactorPage';

import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import NewOrderPage from './pages/dashboard/NewOrderPage';
import OrdersPage from './pages/dashboard/OrdersPage';
import OrderDetailPage from './pages/dashboard/OrderDetailPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import SecurityPage from './pages/dashboard/SecurityPage';
import SupportPage from './pages/dashboard/SupportPage';

import ResellerDashboard from './pages/reseller/ResellerDashboard';
import ResellerClients from './pages/reseller/ResellerClients';
import ResellerEarnings from './pages/reseller/ResellerEarnings';
import ResellerWithdraw from './pages/reseller/ResellerWithdraw';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import ProvisionVM from './pages/admin/ProvisionVM';

import PaymentCallback from './pages/PaymentCallback';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId="952372491238-ioqvll5kiq9slvpf40jquujpka18c6ps.apps.googleusercontent.com">
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } }} />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
          <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="new-order" element={<NewOrderPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>

          <Route path="/reseller" element={<ProtectedRoute roles={['reseller', 'super_admin']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<ResellerDashboard />} />
            <Route path="clients" element={<ResellerClients />} />
            <Route path="earnings" element={<ResellerEarnings />} />
            <Route path="withdraw" element={<ResellerWithdraw />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute roles={['super_admin', 'finance_admin']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id/provision" element={<ProvisionVM />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}
