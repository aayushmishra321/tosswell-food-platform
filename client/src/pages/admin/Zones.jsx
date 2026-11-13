import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

const EMPTY = { name: '', pincodes: '', fee: '', minOrder: '', active: true, etaMin: '30' };

export default function DeliveryZones() {
  const [zones,   setZones]   = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState('');

  const load = () => api.get('/zones/admin').then((r) => setZones(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const payload = {
      name:     form.name,
      pincodes: form.pincodes.split(',').map((p) => p.trim()).filter(Boolean),
      fee:      Number(form.fee),
      minOrder: Number(form.minOrder) || 0,
      active:   form.active,
      etaMin:   Number(form.etaMin) || 30,
    };
    try {
      if (editing) {
        await api.patch(`/zones/admin/${editing}`, payload);
        toast.success('Zone updated');
        setEditing(null);
      } else {
        await api.post('/zones/admin', payload);
        toast.success('Zone created');
      }
      setForm(EMPTY); load();
    } catch (e) { setError(errMsg(e)); }
  };

  const del = async (id) => {
    if (!confirm('Delete this delivery zone?')) return;
    await api.delete(`/zones/admin/${id}`);
    load(); toast.success('Zone deleted');
  };

  const startEdit = (z) => {
    setEditing(z._id);
    setForm({ name: z.name, pincodes: z.pincodes.join(', '), fee: z.fee, minOrder: z.minOrder || '', active: z.active, etaMin: z.etaMin || 30 });
  };

  const f = (name, label, props = {}) => (
    <label className="block">
      <span className="text-xs font-medium text-mute mb-1 block">{label}</span>
      <input className="input text-sm" value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl mb-1">Delivery Zones</h1><p className="text-mute text-sm">Configure delivery areas and fees</p></div>

      <div className="card p-5">
        <p className="font-semibold mb-4">{editing ? 'Edit Zone' : 'Add New Zone'}</p>
        <form onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
            {f('name',     'Zone Name *',           { required: true, placeholder: 'Central Mumbai' })}
            {f('pincodes', 'Pincodes (comma-sep) *', { required: true, placeholder: '400001, 400002' })}
            {f('fee',      'Delivery Fee (₹) *',    { required: true, type: 'number', min: 0 })}
            {f('minOrder', 'Min Order (₹)',          { type: 'number', min: 0 })}
            {f('etaMin',   'Est. Delivery (mins)',   { type: 'number', min: 10 })}
            <label className="flex items-center gap-2 mt-5">
              <input type="checkbox" className="accent-basil w-4 h-4" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>
          {error && <p className="msg-error mb-3">{error}</p>}
          <div className="flex gap-2">
            <button className="btn">{editing ? 'Update Zone' : 'Create Zone'}</button>
            {editing && <button type="button" className="btn-quiet" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line bg-paper"><p className="font-semibold">Configured Zones</p></div>
        {!zones ? <div className="p-8 text-center text-mute">Loading…</div> :
          zones.length === 0 ? <div className="p-8 text-center text-mute">No delivery zones configured yet</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-mute uppercase bg-paper">
                  <tr>{['Zone','Pincodes','Fee','Min Order','ETA','Status',''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {zones.map((z) => (
                    <tr key={z._id} className="hover:bg-paper">
                      <td className="px-4 py-3 font-semibold">{z.name}</td>
                      <td className="px-4 py-3 text-xs text-mute max-w-xs truncate">{z.pincodes.join(', ')}</td>
                      <td className="px-4 py-3">₹{z.fee}</td>
                      <td className="px-4 py-3">₹{z.minOrder || 0}</td>
                      <td className="px-4 py-3">{z.etaMin} min</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${z.active ? 'badge-green' : 'badge-gray'}`}>{z.active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="btn-quiet text-xs" onClick={() => startEdit(z)}>Edit</button>
                          <button className="btn-quiet text-xs text-tomato" onClick={() => del(z._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
