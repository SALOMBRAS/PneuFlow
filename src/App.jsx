import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/Auth/AuthCallback'));
const SetPassword = lazy(() => import('./pages/Auth/SetPassword'));
const Subscription = lazy(() => import('./pages/Subscription'));
const StoreHome = lazy(() => import('./pages/StoreFront/StoreHome'));

const DashboardShell = lazy(() => import('./pages/Dashboard/DashboardShell'));
const DashboardHome = lazy(() => import('./pages/Dashboard/DashboardHome'));
const Catalog = lazy(() => import('./pages/Dashboard/Catalog'));
const Leads = lazy(() => import('./pages/Dashboard/Leads'));
const StoreSettings = lazy(() => import('./pages/Dashboard/StoreSettings'));
const Sellers = lazy(() => import('./pages/Dashboard/Sellers'));

const routeFallback = (
  <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
    Carregando...
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={routeFallback}>
        <Routes>
          {/* Public SaaS Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          <Route path="/assinatura" element={<Subscription />} />

          {/* Public Storefront */}
          <Route path="/store/:storeSlug" element={<StoreHome />} />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardShell />}>
            <Route index element={<DashboardHome />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="leads" element={<Leads />} />
            <Route path="sellers" element={<Sellers />} />
            <Route path="settings" element={<StoreSettings />} />
          </Route>

          {/* Catch-all redirect to Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
