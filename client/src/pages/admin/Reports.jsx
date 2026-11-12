import { useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

// Download a file through Axios so the Authorization header is sent
async function downloadBlob(url, filename) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  } catch (e) {
    toast.error('Download failed: ' + errMsg(e));
  }
}

export default function Reports() {
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [status, setStatus] = useState('');

  const download = (path, filename) => {
    const params = new URLSearchParams();
    if (from)   params.append('from', from);
    if (to)     params.append('to', to);
    if (status) params.append('status', status);
    const qs = params.toString();
    downloadBlob(`/reports/${path}${qs ? '?' + qs : ''}`, filename);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-1">Reports & Exports</h1>
        <p className="text-mute text-sm">Download data for analysis</p>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <p className="font-semibold mb-3">Filter Options</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium mb-1 block">From date</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">To date</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Order status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['Order Placed','Payment Confirmed','Preparing','Out for Delivery','Delivered','Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: '📊 Orders CSV',    sub: 'Export orders to CSV spreadsheet',   path: 'orders.csv',    file: 'orders.csv'    },
          { title: '📗 Orders Excel',  sub: 'Export orders to Excel workbook',    path: 'orders.xlsx',   file: 'orders.xlsx'   },
          { title: '🥦 Inventory CSV', sub: 'Export current inventory levels',    path: 'inventory.csv', file: 'inventory.csv' },
        ].map(({ title, sub, path, file }) => (
          <div key={title} className="card p-5">
            <p className="font-semibold mb-1">{title}</p>
            <p className="text-sm text-mute mb-4">{sub}</p>
            <button className="btn w-full" onClick={() => download(path, file)}>Download</button>
          </div>
        ))}
      </div>

      {/* PDF invoice lookup */}
      <div className="card p-5">
        <p className="font-semibold mb-3">🧾 Download Individual Invoice (PDF)</p>
        <InvoiceLookup />
      </div>
    </div>
  );
}

function InvoiceLookup() {
  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState(null);
  const [busy,    setBusy]    = useState(false);

  const doSearch = async () => {
    if (!search.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/admin/orders?search=${encodeURIComponent(search.trim())}&limit=5`);
      setResults(data.orders);
    } catch { setResults([]); }
    finally { setBusy(false); }
  };

  const downloadInvoice = (orderId) => {
    const shortId = String(orderId).slice(-6).toUpperCase();
    downloadBlob(`/reports/invoice/${orderId}`, `invoice-${shortId}.pdf`);
  };

  return (
    <div className="space-y-3 max-w-xl">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Search order ID or customer name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
        <button className="btn-quiet" disabled={busy} onClick={doSearch}>{busy ? '…' : 'Search'}</button>
      </div>
      {results && (
        results.length === 0
          ? <p className="text-mute text-sm">No orders found</p>
          : (
            <ul className="space-y-2">
              {results.map((o) => (
                <li key={o._id} className="flex items-center justify-between rounded-xl border border-line px-4 py-2 text-sm">
                  <span>
                    <span className="font-mono font-bold">#{String(o._id).slice(-6).toUpperCase()}</span>
                    <span className="ml-2 text-mute">{o.user?.name} · ₹{o.total}</span>
                  </span>
                  <button className="btn-sm" onClick={() => downloadInvoice(o._id)}>PDF</button>
                </li>
              ))}
            </ul>
          )
      )}
    </div>
  );
}
