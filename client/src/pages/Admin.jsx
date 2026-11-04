// Legacy file — AdminLogin is used by App.jsx for /admin/login route.
// The full admin panel is now in AdminLayout + pages/admin/*.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import toast from 'react-hot-toast';

export function AdminLogin() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [v,    setV]    = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/admin/login', v);
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}`);
      navigate('/admin');
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍕</div>
          <h1 className="text-3xl font-extrabold text-basil">Tosswell Kitchen</h1>
          <p style={{ color: 'var(--color-mute)', marginTop: '0.25rem' }}>Admin dashboard login</p>
        </div>
        <div className="card p-8">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="block">
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Admin email</span>
              <input className="input" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
            </label>
            <label className="block">
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</span>
              <input className="input" type="password" required value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
            </label>
            <button className="btn" style={{ width: '100%', paddingTop: '0.75rem', paddingBottom: '0.75rem', marginTop: '0.5rem' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// AdminPanel is kept as a named export for any old references,
// but the actual rendering goes through AdminLayout.
export function AdminPanel() { return null; }
