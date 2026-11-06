import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

const EMPTY = { code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', expiresAt: '', usageLimit: '', perUserLimit: '1' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);

  const load = () => api.get('/admin/coupons').then((r) => setCoupons(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const f = (name, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-mute">{label}</span>
      <input className="input text-sm" value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...props} />
    </label>
  );

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/admin/coupons', {
        code: form.code.toUpperCase().trim(),
        type: form.type, value: Number(form.value),
        ...(form.minOrder    && { minOrder:    Number(form.minOrder) }),
        ...(form.maxDiscount && { maxDiscount: Number(form.maxDiscount) }),
        ...(form.expiresAt   && { expiresAt:   new Date(form.expiresAt).toISOString() }),
        ...(form.usageLimit  && { usageLimit:  Number(form.usageLimit) }),
        perUserLimit: Number(form.perUserLimit) || 1,
      });
      setForm(EMPTY); await load(); toast.success('Coupon created');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const toggle = async (id, active) => {
    await api.patch(`/admin/coupons/${id}`, { active });
    await load();
    toast.success(active ? 'Coupon enabled' : 'Coupon disabled');
  };

  const del = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/admin/coupons/${id}`);
    await load(); toast.success('Coupon deleted');
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl mb-1">Coupons</h1><p className="text-mute text-sm">Create and manage discount codes</p></div>

      {/* Create form */}
      <div className="card p-5">
        <p className="font-semibold mb-4">Create New Coupon</p>
        <form onSubmit={create}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            {f('code', 'Code *', { required: true, placeholder: 'SAVE20' })}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-mute">Type *</span>
              <select className="input text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </label>
            {f('value',      `Value * (${form.type === 'percent' ? '%' : '₹'})`, { required: true, type: 'number', min: 0 })}
            {f('minOrder',   'Min Order (₹)', { type: 'number', min: 0 })}
            {f('maxDiscount','Max Discount (₹)', { type: 'number', min: 0 })}
            {f('expiresAt',  'Expires At', { type: 'datetime-local' })}
            {f('usageLimit', 'Total Uses Allowed', { type: 'number', min: 1 })}
            {f('perUserLimit','Uses Per User', { type: 'number', min: 1 })}
          </div>
          {error && <p className="msg-error mb-3">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create Coupon'}</button>
        </form>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line bg-paper"><p className="font-semibold">All Coupons</p></div>
        {!coupons ? <div className="p-8 text-center text-mute">Loading…</div> :
          coupons.length === 0 ? <div className="p-8 text-center text-mute">No coupons yet</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-mute uppercase bg-paper">
                  <tr>{['Code','Type','Value','Min Order','Used','Expires','Status',''].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {coupons.map((c) => {
                    const isActive = c.active ?? c.isActive ?? true;
                    const usageLimit = c.usageLimit ?? c.totalUses;
                    const typeLabel = c.type === 'percentage' ? 'percent' : c.type;
                    return (
                      <tr key={c._id} className="hover:bg-paper transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                        <td className="px-4 py-3 capitalize">{typeLabel}</td>
                        <td className="px-4 py-3">{typeLabel === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
                        <td className="px-4 py-3">₹{c.minOrder || 0}</td>
                        <td className="px-4 py-3">{c.usedCount}{usageLimit ? `/${usageLimit}` : ''}</td>
                        <td className="px-4 py-3 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="btn-quiet text-xs" onClick={() => toggle(c._id, !isActive)}>
                              {isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn-quiet text-xs text-tomato" onClick={() => del(c._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
