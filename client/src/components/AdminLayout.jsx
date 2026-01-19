import { useState, lazy, Suspense } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth';

const Overview   = lazy(() => import('../pages/admin/Overview'));
const Orders     = lazy(() => import('../pages/admin/Orders'));
const Inventory  = lazy(() => import('../pages/admin/Inventory'));
const Coupons    = lazy(() => import('../pages/admin/Coupons'));
const Customers  = lazy(() => import('../pages/admin/Customers'));
const Reviews    = lazy(() => import('../pages/admin/Reviews'));
const Images     = lazy(() => import('../pages/admin/Images'));
const Analytics  = lazy(() => import('../pages/admin/Analytics'));
const AiInsights = lazy(() => import('../pages/admin/AiInsights'));
const Refunds    = lazy(() => import('../pages/admin/Refunds'));
const Reports    = lazy(() => import('../pages/admin/Reports'));
const Zones      = lazy(() => import('../pages/admin/Zones'));

const Loader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-basil border-t-transparent" />
  </div>
);

const NAV = [
  { to: '/admin',             label: 'Overview',    icon: '📊', end: true },
  { to: '/admin/orders',      label: 'Orders',      icon: '📦' },
  { to: '/admin/inventory',   label: 'Inventory',   icon: '🥦' },
  { to: '/admin/coupons',     label: 'Coupons',     icon: '🎟️' },
  { to: '/admin/customers',   label: 'Customers',   icon: '👥' },
  { to: '/admin/reviews',     label: 'Reviews',     icon: '⭐' },
  { to: '/admin/images',      label: 'Images',      icon: '🖼️' },
  { to: '/admin/analytics',   label: 'Analytics',   icon: '📈' },
  { to: '/admin/ai-insights', label: 'AI Insights', icon: '🤖' },
  { to: '/admin/refunds',     label: 'Refunds',     icon: '💸' },
  { to: '/admin/reports',     label: 'Reports',     icon: '📄' },
  { to: '/admin/zones',       label: 'Zones',       icon: '🗺️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/admin/login'); };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-basil text-white' : 'text-mute hover:bg-line hover:text-ink'
    }`;

  const Sidebar = () => (
    <aside className="flex h-full flex-col bg-white border-r border-line">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-line">
        <span className="text-2xl">🍕</span>
        <div>
          <p className="font-display font-extrabold text-basil leading-tight">Tosswell</p>
          <p className="text-xs text-mute">Kitchen Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} onClick={() => setSidebarOpen(false)}>
            <span>{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-basil text-white font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-mute">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-quiet w-full text-sm text-tomato border-tomato/30 hover:bg-tomato/5">
          Log out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Desktop sidebar */}
      <div className="hidden w-56 shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-56 shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
          <button className="md:hidden btn-ghost" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="font-semibold text-sm hidden sm:block">Tosswell Kitchen</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="badge badge-green text-xs">Admin</span>
            <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
          </div>
        </header>

        {/* Page area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route index                element={<Overview />} />
              <Route path="orders"        element={<Orders />} />
              <Route path="inventory"     element={<Inventory />} />
              <Route path="coupons"       element={<Coupons />} />
              <Route path="customers"     element={<Customers />} />
              <Route path="reviews"       element={<Reviews />} />
              <Route path="images"        element={<Images />} />
              <Route path="analytics"     element={<Analytics />} />
              <Route path="ai-insights"   element={<AiInsights />} />
              <Route path="refunds"       element={<Refunds />} />
              <Route path="reports"       element={<Reports />} />
              <Route path="zones"         element={<Zones />} />
              <Route path="*"             element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
