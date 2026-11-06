import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [total,     setTotal]     = useState(0);
  const [search,    setSearch]    = useState('');
  const [q,         setQ]         = useState('');
  const [error,     setError]     = useState('');
  const [selected,  setSelected]  = useState(null);
  const [orders,    setOrders]    = useState(null);

  const load = async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (q) params.append('search', q);
      const { data } = await api.get(`/admin/customers?${params}`);
      setCustomers(data.customers); setPages(data.pages); setTotal(data.total); setError('');
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(page); }, [page, q]);

  const viewOrders = async (customer) => {
    setSelected(customer); setOrders(null);
    const { data } = await api.get(`/admin/customers/${customer._id}/orders`);
    setOrders(data);
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl mb-1">Customers</h1><p className="text-mute text-sm">{total} registered customers</p></div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-sm">🔍</span>
          <input className="input pl-9" placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setQ(search), setPage(1))} />
        </div>
        <button className="btn-quiet" onClick={() => { setQ(search); setPage(1); }}>Search</button>
      </div>

      {error && <p className="msg-error">{error}</p>}

      <div className="card overflow-hidden">
        {!customers ? <div className="p-8 text-center text-mute">Loading…</div> :
          customers.length === 0 ? <div className="p-8 text-center text-mute">No customers found</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-mute uppercase bg-paper">
                  <tr>{['Customer','Email','Joined','Orders','Total Spent','Tier',''].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-paper transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-basil text-white text-xs font-bold shrink-0">
                            {c.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{c.name}</span>
                          {!c.verified && <span className="badge badge-yellow text-xs">Unverified</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-mute">{c.email}</td>
                      <td className="px-4 py-3 text-mute">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold">{c.orders}</td>
                      <td className="px-4 py-3 font-semibold text-basil">₹{c.spent.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${c.loyaltyTier === 'Gold' ? 'badge-yellow' : c.loyaltyTier === 'Silver' ? 'badge-gray' : 'badge-gray'}`}>
                          {c.loyaltyTier === 'Gold' ? '🥇' : c.loyaltyTier === 'Silver' ? '🥈' : '🥉'} {c.loyaltyTier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="btn-quiet text-xs" onClick={() => viewOrders(c)}>Orders</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="text-sm text-mute">Page {page} of {pages}</span>
          <button className="btn-quiet" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}

      {/* Customer orders modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg card p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selected.name}'s Orders</h2>
              <button onClick={() => setSelected(null)} className="text-mute hover:text-ink text-xl">✕</button>
            </div>
            {!orders ? <p className="text-mute">Loading…</p> :
              orders.length === 0 ? <p className="text-mute">No orders yet</p> : (
                <ul className="space-y-3">
                  {orders.map((o) => (
                    <li key={o._id} className="rounded-xl border border-line p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold">#{o._id.slice(-6).toUpperCase()}</span>
                        <span className="badge badge-green">{o.status}</span>
                      </div>
                      <p className="text-mute">{new Date(o.createdAt).toLocaleDateString()}</p>
                      <p className="font-semibold text-basil mt-1">₹{o.total}</p>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
