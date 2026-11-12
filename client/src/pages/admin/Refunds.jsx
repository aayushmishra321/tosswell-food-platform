import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

const statusColor = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', processed: 'badge-green' };

export default function AdminRefunds() {
  const [refunds,  setRefunds]  = useState(null);
  const [filter,   setFilter]   = useState('');
  const [selected, setSelected] = useState(null);
  const [note,     setNote]     = useState('');
  const [busy,     setBusy]     = useState(false);

  const load = () =>
    api.get(`/refunds${filter ? `?status=${filter}` : ''}`)
      .then((r) => setRefunds(r.data))
      .catch(() => {});

  useEffect(() => { load(); }, [filter]);

  const update = async (id, status) => {
    setBusy(true);
    try {
      await api.patch(`/refunds/${id}`, { status, adminNote: note });
      toast.success(`Refund marked as ${status}`);
      setSelected(null); setNote('');
      load();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl mb-1">Refund Requests</h1><p className="text-mute text-sm">Manage customer refund requests</p></div>

      <div className="flex gap-3">
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['pending','approved','rejected','processed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!refunds ? <div className="skeleton h-32 rounded-2xl" /> :
        refunds.length === 0 ? <div className="card p-12 text-center text-mute">No refund requests found</div> : (
          <div className="space-y-3">
            {refunds.map((ref) => (
              <div key={ref._id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold">#{String(ref._id).slice(-6).toUpperCase()}</span>
                    <span className="ml-2 text-sm text-mute">{ref.user?.name} · {ref.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${statusColor[ref.status]}`}>{ref.status}</span>
                    <span className="font-bold text-basil">₹{ref.amount}</span>
                  </div>
                </div>
                <p className="text-sm text-mute mb-1">Order: #{String(ref.order?._id).slice(-6).toUpperCase()} · {ref.order?.status}</p>
                <p className="text-sm mb-3">"{ref.reason}"</p>
                {ref.adminNote && <p className="text-xs text-mute mb-2">Admin note: {ref.adminNote}</p>}
                <p className="text-xs text-mute">{new Date(ref.createdAt).toLocaleString()}</p>

                {ref.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    {selected === ref._id ? (
                      <>
                        <input className="input-sm flex-1 min-w-48" placeholder="Admin note (optional)"
                          value={note} onChange={(e) => setNote(e.target.value)} />
                        <button className="btn-sm" disabled={busy} onClick={() => update(ref._id, 'approved')}>Approve</button>
                        <button className="btn-sm" style={{ background: '#d13527' }} disabled={busy} onClick={() => update(ref._id, 'rejected')}>Reject</button>
                        <button className="btn-quiet text-xs" onClick={() => setSelected(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn-quiet text-xs" onClick={() => setSelected(ref._id)}>Review →</button>
                    )}
                  </div>
                )}
                {ref.status === 'approved' && (
                  <button className="btn-sm mt-2" disabled={busy} onClick={() => update(ref._id, 'processed')}>
                    Mark as Processed
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
