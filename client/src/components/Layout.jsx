import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth';
import { useCart } from '../cart';

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-basil' : 'text-mute hover:text-ink'}`;

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className={`sticky top-0 z-40 bg-white transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {/* Logo */}
          <Link to="/" className="mr-auto flex items-center gap-2 font-display text-xl font-extrabold text-basil shrink-0">
            <span className="text-2xl">🍕</span>
            Tosswell Pizza
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/"     end className={navCls}>Home</NavLink>
            <NavLink to="/menu"     className={navCls}>Menu</NavLink>
            <NavLink to="/build"    className={navCls}>Build Your Pizza</NavLink>
            {user && <>
              <NavLink to="/orders"    className={navCls}>My Orders</NavLink>
              <NavLink to="/wishlist"  className={navCls}>Wishlist</NavLink>
            </>}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-basil/10 text-basil transition-colors hover:bg-basil hover:text-white">
                  🛒
                  {count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-tomato text-xs font-bold text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
                <Link to="/account" className="flex h-9 w-9 items-center justify-center rounded-full bg-basil text-white text-sm font-bold">
                  {user.name[0].toUpperCase()}
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-xs">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-ghost text-sm">Log in</Link>
                <Link to="/register" className="btn btn-sm">Sign up</Link>
              </>
            )}
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-basil/10 text-basil">
                🛒
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-tomato text-xs font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg border border-line"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-5 bg-ink transition-all ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`block h-0.5 w-5 bg-ink transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-ink transition-all ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </button>
          </div>
        </div>

        {/* Gingham stripe */}
        <div className="gingham" />

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-line bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {[
                ['/', 'Home'],
                ['/menu', 'Menu'],
                ['/build', 'Build Your Pizza'],
                ...(user ? [
                  ['/orders',   'My Orders'],
                  ['/wishlist', 'Wishlist'],
                  ['/account',  'Account'],
                ] : []),
              ].map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'} className={navCls} onClick={() => setMobileOpen(false)}>
                  {label}
                </NavLink>
              ))}
              {user ? (
                <button onClick={handleLogout} className="text-left text-sm text-tomato">Log out</button>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link to="/login"    className="btn-quiet flex-1 text-center text-sm" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <Link to="/register" className="btn flex-1 text-center text-sm"       onClick={() => setMobileOpen(false)}>Sign up</Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-ink text-white/70 mt-16">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-3 font-display text-lg font-extrabold text-white">🍕 Tosswell Pizza</p>
              <p className="text-sm">Premium pizzas, baked to order and delivered to your door.</p>
              <p className="mt-3 text-xs">📧 tosswellpizza@gmail.com</p>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Order</p>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/menu"  className="hover:text-white">Menu</Link>
                <Link to="/build" className="hover:text-white">Build Your Pizza</Link>
                <Link to="/cart"  className="hover:text-white">Cart</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Account</p>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/account"   className="hover:text-white">My Account</Link>
                <Link to="/orders"    className="hover:text-white">Order History</Link>
                <Link to="/wishlist"  className="hover:text-white">Wishlist</Link>
                <Link to="/addresses" className="hover:text-white">Saved Addresses</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Info</p>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/support"     className="hover:text-white">Support</Link>
                <span className="hover:text-white cursor-default">Delivery Policy</span>
                <span className="hover:text-white cursor-default">Refund Policy</span>
                <span className="hover:text-white cursor-default">Privacy Policy</span>
                <Link to="/admin/login" className="hover:text-white">Admin</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs">
            © {new Date().getFullYear()} Tosswell Pizza · All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
