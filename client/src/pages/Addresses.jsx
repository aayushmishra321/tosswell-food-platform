import { useEffect, useState } from 'react';
import { api, errMsg } from '../api';
import toast from 'react-hot-toast';

const EMPTY = { label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

function AddressForm({ initial = EMPTY, onSave, onCancel }) {
  const [v,    setV]    = useState(initial);
  const [busy, setBusy] = useState(false);
  const f = (name, label, props = {}) => (
    <label className="block col-span-1">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="input" value={v[name]} onChange={(e) => setV({ ...v, [name]: e.target.value })} {...props} />
    </label>
  );
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await onSave(v); }
    catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {f('label', 'Label', { placeholder: 'Home / Office' })}
        {f('line1', 'Street address *', { required: true })}
        {f('line2', 'Apt, floor etc.')}
        {f('city',  'City *', { required: true })}
        {f('state', 'State *', { required: true })}
        {f('pincode', 'Pincode *', { required: true, pattern: '\\d{6}', maxLength: 6 })}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="accent-basil w-4 h-4" checked={v.isDefault} onChange={(e) => setV({ ...v, isDefault: e.target.checked })} />
        Set as default address
      </label>
      <div className="flex gap-3">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save Address'}</button>
        {onCancel && <button type="button" className="btn-quiet" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function Addresses() {
  const [addresses, setAddresses] = useState(null);
  const [adding,    setAdding]    = useState(false);
  const [editing,   setEditing]   = useState(null);

  const load = () => api.get('/addresses').then((r) => setAddresses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add    = async (data) => { await api.post('/addresses', data); await load(); setAdding(false); toast.success('Address saved'); };
  const update = async (id, data) => { await api.patch(`/addresses/${id}`, data); await load(); setEditing(null); toast.success('Address updated'); };
  const remove = async (id) => { if (!confirm('Remove this address?')) return; await api.delete(`/addresses/${id}`); await load(); toast.success('Address removed'); };
  const setDef = async (id) => { await api.post(`/addresses/${id}/default`); await load(); };

  if (!addresses) return <div className="mx-auto max-w-2xl px-4 py-8"><div className="skeleton h-32 rounded-2xl" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-4xl mb-1">My Addresses</h1><p className="text-mute">Manage your saved delivery addresses</p></div>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add Address</button>}
      </div>

      {adding && <div className="mb-6"><AddressForm onSave={add} onCancel={() => setAdding(false)} /></div>}

      {addresses.length === 0 && !adding ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📍</div>
          <p className="text-xl font-semibold mb-2">No addresses yet</p>
          <p className="text-mute mb-4">Add an address for faster checkout</p>
          <button className="btn" onClick={() => setAdding(true)}>Add Address</button>
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((a) => (
            <li key={a._id} className="card">
              {editing === a._id ? (
                <div className="p-4"><AddressForm initial={a} onSave={(d) => update(a._id, d)} onCancel={() => setEditing(null)} /></div>
              ) : (
                <div className="flex flex-wrap items-start gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">📍 {a.label}</span>
                      {a.isDefault && <span className="badge badge-green">Default</span>}
                    </div>
                    <p className="text-sm text-mute">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                    <p className="text-sm text-mute">{a.city}, {a.state} — {a.pincode}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!a.isDefault && <button className="btn-quiet text-xs" onClick={() => setDef(a._id)}>Set Default</button>}
                    <button className="btn-quiet text-xs" onClick={() => setEditing(a._id)}>Edit</button>
                    <button className="btn-quiet text-xs text-tomato" onClick={() => remove(a._id)}>Remove</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
