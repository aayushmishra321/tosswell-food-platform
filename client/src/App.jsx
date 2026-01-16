import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { useAuth } from './auth';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

const Home       = lazy(() => import('./pages/Home'));
const Menu       = lazy(() => import('./pages/Menu'));
const Builder    = lazy(() => import('./pages/Builder'));
const Checkout   = lazy(() => import('./pages/Checkout'));
const Orders     = lazy(() => import('./pages/Orders'));
const Addresses  = lazy(() => import('./pages/Addresses'));
const Support    = lazy(() => import('./pages/Support'));
const Account    = lazy(() => import('./pages/Account'));
const Wishlist   = lazy(() => import('./pages/Wishlist'));
const AiChat     = lazy(() => import('./pages/AiChat'));

const Login    = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const Verify   = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Verify })));
const Forgot   = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Forgot })));
const Reset    = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Reset })));

const AdminLogin   = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminLogin })));
const AdminPanel   = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPanel })));

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-basil border-t-transparent" />
  </div>
);

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user)  return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

function RedirectIfLoggedIn({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public + customer routes with shared layout ── */}
        <Route element={<Layout />}>
          <Route path="/"          element={<Home />} />
          <Route path="/menu"      element={<Menu />} />
          <Route path="/build"     element={<Builder />} />

          <Route path="/login"     element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
          <Route path="/register"  element={<RedirectIfLoggedIn><Register /></RedirectIfLoggedIn>} />
          <Route path="/verify/:token" element={<Verify />} />
          <Route path="/forgot"    element={<Forgot />} />
          <Route path="/reset/:token"  element={<Reset />} />

          {/* Auth-required customer routes */}
          <Route path="/cart"      element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders"    element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/addresses" element={<RequireAuth><Addresses /></RequireAuth>} />
          <Route path="/account"   element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/wishlist"  element={<RequireAuth><Wishlist /></RequireAuth>} />
          <Route path="/support"   element={<Support />} />
        </Route>

        {/* ── Admin routes ── */}
        <Route path="/admin/login" element={<RedirectIfLoggedIn><AdminLogin /></RedirectIfLoggedIn>} />
        <Route path="/admin/*" element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* AI chat widget — rendered outside layout so it floats everywhere */}
      <Suspense fallback={null}>
        <AiChat />
      </Suspense>
    </Suspense>
  );
}
