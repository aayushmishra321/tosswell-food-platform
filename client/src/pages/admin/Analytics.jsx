import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { api, errMsg } from '../../api';

const COLORS = ['#1f5c3a','#cf3b2d','#e2a93b','#5d6b62','#1a2419'];

export default function Analytics() {
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="msg-error">{error}</p>;
  if (!data)  return <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}</div>;

  const { summary, dailySales, hourlySales, topPizzas, statusDist } = data;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl mb-1">Analytics</h1><p className="text-mute text-sm">Business performance overview</p></div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total Revenue',   `₹${summary.totalRevenue.toLocaleString('en-IN')}`, 'text-basil'],
          ['Total Orders',    summary.totalOrders, 'text-ink'],
          ['Avg Order Value', `₹${summary.avgOrderValue}`, 'text-ink'],
          ['Customers',       summary.customerCount, 'text-ink'],
        ].map(([l, v, c]) => (
          <div key={l} className="card p-5">
            <p className="text-sm text-mute mb-1">{l}</p>
            <p className={`text-3xl font-extrabold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Daily revenue */}
      <div className="card p-5">
        <p className="font-semibold mb-4">📈 Daily Revenue — Last 30 Days</p>
        {dailySales.length === 0 ? <p className="text-mute text-sm">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5d8" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#1f5c3a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top pizzas */}
        <div className="card p-5">
          <p className="font-semibold mb-4">🏆 Top Pizzas</p>
          {topPizzas.length === 0 ? <p className="text-mute text-sm">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topPizzas} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="_id" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#1f5c3a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by hour */}
        <div className="card p-5">
          <p className="font-semibold mb-4">🕐 Peak Ordering Hours</p>
          {hourlySales.length === 0 ? <p className="text-mute text-sm">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlySales}>
                <XAxis dataKey="_id" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="count" fill="#cf3b2d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status distribution */}
        {statusDist.length > 0 && (
          <div className="card p-5">
            <p className="font-semibold mb-4">📋 Order Status Distribution</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily orders */}
        <div className="card p-5">
          <p className="font-semibold mb-4">📦 Daily Orders — Last 30 Days</p>
          {dailySales.length === 0 ? <p className="text-mute text-sm">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5d8" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#e2a93b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
