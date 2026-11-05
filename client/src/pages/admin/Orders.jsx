import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import PizzaImage from '../../PizzaImage';
import toast from 'react-hot-toast';

const STATUSES = ['Order Placed','Payment Confirmed','Preparing','Out for Delivery','Delivered','Cancelled'];

const statusColor = {
  'Order Placed':       'badge-yellow',
  'Payment Confirmed':  'badge-yellow',
  'Preparing':          'badge-yellow',
  'Out for Delivery':   'badge-yellow',
  'Delivered':          'badge-green',
  'Cancelled':          'badge-red',
};

export default function AdminOrders() {
  const [orders,  setOrders]  = useState(null);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [status,  setStatus]  = useState('');
  const [search,  setSearch]  = useState('');
  const [q,       setQ]       = useState('');
  const [error,   setError]   = useState('');
  const [expanded,setExpanded]= useState(null);

  const load = async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (status) params.append('status', status);
      if (q)      params.append('search', q);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.orders); setPages(data.pages); setTotal(data.total); setError('');
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(page); }, [page, status, q]);
  useEffect(() => { const t = setInterval(() => load(page), 15000); return () => clearInterval(t); }, [page, status, q]);

  const updateStatus = async (id, newStatus) => {
    try {
      const { data } = await api.patch(`/admin/orders/${id}/status`, { status: newStatus });
      setOrders((os) => os.map((o) => o._id === id ? { ...o, status: data.status } : o));
      toast.success(`Order updated to ${newStatus}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl mb-1">Orders</h1><p className="text-mute text-sm">{total} total orders</p></div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-sm">🔍</span>
          <input className="input pl-9" placeholder="Search by customer name, email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setQ(search), setPage(1))} />
        </div>
        <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-quiet" onClick={() => { setQ(search); setPage(1); }}>Search</button>
      </div>

      {error && <p className="msg-error">{error}</p>}

      {!orders ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-mute">No orders found</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o._id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-paper transition-colors"
                onClick={() => setExpanded(expanded === o._id ? null : o._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">#{o._id.slice(-6).toUpperCase()}</span>
                    <span className={`badge ${statusColor[o.status] || 'badge-gray'}`}>{o.status}</span>
                  </div>
                  <p className="text-sm text-mute truncate">{o.user?.name} · {o.user?.email}</p>
                  <p className="text-xs text-mute">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-basil">₹{o.total}</p>
                  <p className="text-xs text-mute">{o.items.length} item(s)</p>
                </div>
                <div>
                  <select className="input-sm !w-auto" value={o.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(o._id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {expanded === o._id && (
                <div className="border-t border-line p-4 bg-paper space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-mute uppercase mb-2">Items</p>
                      <ul className="space-y-2">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <PizzaImage src={it.imageUrl} alt={it.name} className="h-10 w-10 shrink-0 rounded-lg" aspectRatio="" />
                            <span className="flex-1">{it.qty} × {it.name}</span>
                            <span className="font-semibold">₹{it.price * it.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {o.address?.line1 && (
                      <div>
                        <p className="text-xs font-semibold text-mute uppercase mb-2">Delivery Address</p>
                        <p className="text-sm">{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}</p>
                        <p className="text-sm">{o.address.city}, {o.address.state} — {o.address.pincode}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-sm border-t border-line pt-2">
                    <span className="text-mute">Subtotal: ₹{o.subtotal}</span>
                    {o.discount > 0 && <span className="text-basil">Discount: -₹{o.discount}</span>}
                    <span className="font-bold">Total: ₹{o.total}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="text-sm text-mute">Page {page} of {pages}</span>
          <button className="btn-quiet" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
