import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import toast from 'react-hot-toast';

export default function Account() {
  const { user, login } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [loyalty,  setLoyalty]  = useState(null);
  const [tab,      setTab]      = useState('profile');
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({});
  const [pwForm,   setPwForm]   = useState({ current: '', next: '' });
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    api.get('/users/profile').then((r) => { setProfile(r.data); setForm({ name: r.data.name, phone: r.data.phone || '' }); }).catch(() => {});
    api.get('/loyalty').then((r) => setLoyalty(r.data)).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch('/users/profile', form);
      setProfile(data);
      setEditing(false);
      toast.success('Profile updated');
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/users/change-password', { current: pwForm.current, next: pwForm.next });
      toast.success('Password changed. Please log in again.');
      setPwForm({ current: '', next: '' });
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  const tierColor = { Bronze: 'text-amber-700 bg-amber-50', Silver: 'text-gray-600 bg-gray-100', Gold: 'text-yellow-700 bg-yellow-50' };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl mb-2">My Account</h1>
      <p className="text-mute mb-6">Manage your profile, security and rewards</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-line">
        {[['profile','👤 Profile'], ['security','🔒 Security'], ['loyalty','🏅 Loyalty'], ['referral','🎁 Referral']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? 'border-basil text-basil' : 'border-transparent text-mute hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-basil text-2xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-xl">{profile?.name || user?.name}</p>
              <p className="text-mute text-sm">{profile?.email || user?.email}</p>
              <span className={`badge text-xs mt-1 ${profile?.verified ? 'badge-green' : 'badge-yellow'}`}>
                {profile?.verified ? '✓ Verified' : '⚠ Unverified'}
              </span>
            </div>
          </div>
          {!editing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {[['Name', profile?.name], ['Email', profile?.email], ['Phone', profile?.phone || '—']].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-mute">{l}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
              <button onClick={() => setEditing(true)} className="btn-quiet">Edit Profile</button>
            </>
          ) : (
            <div className="space-y-3">
              <label className="block"><span className="text-sm font-medium mb-1 block">Name</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="block"><span className="text-sm font-medium mb-1 block">Phone</span>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <div className="flex gap-3">
                <button onClick={saveProfile} disabled={busy} className="btn">{busy ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="btn-quiet">Cancel</button>
              </div>
            </div>
          )}
          <div className="pt-4 border-t border-line">
            <Link to="/addresses" className="btn-quiet">Manage Addresses →</Link>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="card p-6">
          <h2 className="text-xl mb-4">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4 max-w-sm">
            <label className="block"><span className="text-sm font-medium mb-1 block">Current password</span>
              <input type="password" className="input" required value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></label>
            <label className="block"><span className="text-sm font-medium mb-1 block">New password (8+ chars)</span>
              <input type="password" className="input" required minLength={8} value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} /></label>
            <button className="btn" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
          </form>
        </div>
      )}

      {/* Loyalty */}
      {tab === 'loyalty' && loyalty && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-mute text-sm">Your points</p>
                <p className="text-4xl font-extrabold text-basil">{loyalty.points}</p>
                <p className="text-sm text-mute">Worth ₹{loyalty.redeemValue} in discounts</p>
              </div>
              <span className={`badge text-base px-4 py-2 ${tierColor[loyalty.tier] || 'badge-gray'}`}>
                {loyalty.tier === 'Gold' ? '🥇' : loyalty.tier === 'Silver' ? '🥈' : '🥉'} {loyalty.tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {[['🥉','Bronze','0'],['🥈','Silver','500'],['🥇','Gold','1500']].map(([e, tier, pts]) => (
                <div key={tier} className={`card p-3 ${loyalty.tier === tier ? 'border-basil bg-basil/5' : ''}`}>
                  <div className="text-2xl mb-1">{e}</div>
                  <p className="font-semibold">{tier}</p>
                  <p className="text-xs text-mute">{pts} pts</p>
                </div>
              ))}
            </div>
          </div>
          {loyalty.history.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold mb-3">Transaction History</h3>
              <div className="space-y-2">
                {loyalty.history.map((tx) => (
                  <div key={tx._id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                    <span className="text-mute">{tx.description}</span>
                    <span className={tx.type === 'earn' || tx.type === 'bonus' ? 'text-basil font-semibold' : 'text-tomato font-semibold'}>
                      {tx.type === 'earn' || tx.type === 'bonus' ? '+' : '-'}{tx.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referral */}
      {tab === 'referral' && <ReferralTab />}
    </div>
  );
}

function ReferralTab() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import('../api').then(({ api }) =>
      api.get('/referral').then((r) => setData(r.data)).catch(() => {})
    );
  }, []);

  const copy = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return <div className="skeleton h-32 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-bold text-xl mb-2">Your Referral Code</h3>
        <p className="text-mute text-sm mb-4">Share this code with friends. When they place their first order, you both earn loyalty points!</p>
        <div className="flex items-center gap-3 rounded-xl border-2 border-basil/30 bg-basil/5 px-5 py-4">
          <span className="font-mono text-3xl font-extrabold text-basil tracking-widest flex-1">{data.code}</span>
          <button onClick={copy} className="btn-sm">{copied ? '✓ Copied!' : 'Copy'}</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="card p-3">
            <p className="text-2xl font-bold text-basil">{data.referrals.length}</p>
            <p className="text-xs text-mute">Friends referred</p>
          </div>
          <div className="card p-3">
            <p className="text-2xl font-bold text-basil">{data.totalEarned}</p>
            <p className="text-xs text-mute">Points earned</p>
          </div>
        </div>
      </div>

      {data.referrals.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Referral History</h3>
          <div className="space-y-2">
            {data.referrals.map((ref, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-line last:border-0">
                <span>{ref.name || 'Friend'}</span>
                <span className={`badge ${ref.rewarded ? 'badge-green' : 'badge-gray'}`}>
                  {ref.rewarded ? '✓ Rewarded' : 'Pending order'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 text-sm text-mute">
        <p className="font-semibold text-ink mb-2">How it works</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Share your referral code with a friend</li>
          <li>They enter the code when creating their account</li>
          <li>After their first order, you earn <strong>100 points</strong></li>
          <li>They earn <strong>50 bonus points</strong> too</li>
        </ol>
      </div>
    </div>
  );
}
