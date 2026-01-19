import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import toast from 'react-hot-toast';

function Shell({ title, sub, children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block font-display text-2xl font-extrabold text-basil mb-4">🍕 Tosswell Pizza</Link>
          <h1 className="text-3xl mb-2">{title}</h1>
          {sub && <p className="text-mute">{sub}</p>}
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className={`input ${error ? 'border-tomato focus:ring-tomato/40' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-tomato">{error}</p>}
    </label>
  );
}

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy,   setBusy]   = useState(false);
  const bind = (name) => ({ name, value: values[name], onChange: (e) => setValues({ ...values, [name]: e.target.value }) });
  return { values, errors, setErrors, busy, setBusy, bind };
}

export function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';
  const f = useForm({ email: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    f.setBusy(true);
    try {
      const { data } = await api.post('/auth/login', f.values);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally { f.setBusy(false); }
  };

  return (
    <Shell title="Welcome back" sub="Sign in to your account">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required {...f.bind('email')} />
        <Field label="Password" type="password" autoComplete="current-password" required {...f.bind('password')} />
        <button className="btn w-full py-3" disabled={f.busy}>{f.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-mute">
        <Link to="/forgot" className="hover:text-basil">Forgot password?</Link>
        <Link to="/register" className="hover:text-basil">Create account</Link>
      </div>
    </Shell>
  );
}

export function Register() {
  const f = useForm({ name: '', email: '', password: '', referralCode: '' });

  const submit = async (e) => {
    e.preventDefault();
    f.setBusy(true);
    try {
      await api.post('/auth/register', f.values);
      toast.success('Account created! Check your inbox for the verification link.');
    } catch (err) {
      toast.error(errMsg(err));
    } finally { f.setBusy(false); }
  };

  return (
    <Shell title="Create account" sub="Start ordering in minutes">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" autoComplete="name" required minLength={2} {...f.bind('name')} />
        <Field label="Email" type="email" autoComplete="email" required {...f.bind('email')} />
        <Field label="Password (8+ characters)" type="password" autoComplete="new-password" required minLength={8} {...f.bind('password')} />
        <Field label="Referral code (optional)" placeholder="e.g. AB12CD" {...f.bind('referralCode')} />
        <button className="btn w-full py-3" disabled={f.busy}>{f.busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-4 text-center text-sm text-mute">
        Already have an account? <Link to="/login" className="text-basil font-semibold hover:underline">Sign in</Link>
      </p>
    </Shell>
  );
}

export function Verify() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    api.post('/auth/verify', { token })
      .then(() => setState({ ok: true }))
      .catch((e) => setState({ error: errMsg(e) }));
  }, [token]);

  return (
    <Shell title="Email verification">
      {state.loading && <p className="text-center text-mute">Verifying…</p>}
      {state.ok    && <p className="msg-ok text-center">✅ Email verified! You can now log in.</p>}
      {state.error && <p className="msg-error text-center">{state.error}</p>}
      <div className="mt-6 text-center">
        <Link to="/login" className="btn">Go to login</Link>
      </div>
    </Shell>
  );
}

export function Forgot() {
  const f = useForm({ email: '' });
  const submit = async (e) => {
    e.preventDefault();
    f.setBusy(true);
    try {
      await api.post('/auth/forgot', f.values);
      toast.success('Reset link sent! Check your inbox.');
    } catch (err) { toast.error(errMsg(err)); }
    finally { f.setBusy(false); }
  };
  return (
    <Shell title="Reset password" sub="We'll send a reset link to your email">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" required {...f.bind('email')} />
        <button className="btn w-full py-3" disabled={f.busy}>{f.busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="mt-4 text-center text-sm"><Link to="/login" className="text-basil hover:underline">← Back to login</Link></p>
    </Shell>
  );
}

export function Reset() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const f = useForm({ password: '' });
  const submit = async (e) => {
    e.preventDefault();
    f.setBusy(true);
    try {
      await api.post('/auth/reset', { token, password: f.values.password });
      toast.success('Password updated!');
      navigate('/login');
    } catch (err) { toast.error(errMsg(err)); }
    finally { f.setBusy(false); }
  };
  return (
    <Shell title="New password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password (8+ characters)" type="password" required minLength={8} autoComplete="new-password" {...f.bind('password')} />
        <button className="btn w-full py-3" disabled={f.busy}>{f.busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </Shell>
  );
}
