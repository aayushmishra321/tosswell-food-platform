
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api, errMsg } from '../../api';

function StatCard({ label, value, sub, color = 'text-ink', icon }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-mute">{label}</p>
        <div className="w-11 h-11 rounded-xl bg-paper flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>

      <h2 className={`text-3xl font-extrabold mt-4 ${color}`}>
        {value}
      </h2>

      <p className="text-xs text-mute mt-2">{sub}</p>
    </div>
  );
}

function ChartHeader({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-paper flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-xs text-mute mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics')
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) {
    return (
      <div className="card p-6">
        <p className="msg-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { summary, dailySales, topPizzas, statusDist, lowStock } = data;

  const totalStatusOrders = statusDist.reduce(
    (total, item) => total + item.count,
    0
  );

  const statusColors = {
    pending: 'bg-amber-500',
    confirmed: 'bg-blue-500',
    preparing: 'bg-orange-500',
    ready: 'bg-purple-500',
    delivered: 'bg-green-600',
    cancelled: 'bg-red-500',
    completed: 'bg-green-600',
  };

  return (
    <div className="space-y-7 pb-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mute font-semibold mb-2">
            Dashboard / Analytics
          </p>

          <h1 className="text-3xl font-bold text-ink">
            Overview
          </h1>

          <p className="text-sm text-mute mt-1">
            Monitor your restaurant's performance and business insights.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-paper border border-line text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-mute">Analytics Dashboard</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">
            Business Summary
          </h2>
          <span className="text-xs text-mute">Overall performance</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={`₹${summary.totalRevenue.toLocaleString('en-IN')}`}
            color="text-basil"
            icon="💰"
            sub="All confirmed orders"
          />

          <StatCard
            label="Total Orders"
            value={summary.totalOrders.toLocaleString('en-IN')}
            icon="📦"
            sub="Confirmed & paid"
          />

          <StatCard
            label="Average Order Value"
            value={`₹${summary.avgOrderValue}`}
            icon="📊"
            sub="Per confirmed order"
          />

          <StatCard
            label="Total Customers"
            value={summary.customerCount.toLocaleString('en-IN')}
            icon="👥"
            sub="Verified accounts"
          />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 overflow-hidden">
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">
                  ⚠️
                </div>

                <div>
                  <h3 className="font-bold text-red-700">
                    Low Stock Alert
                  </h3>
                  <p className="text-xs text-red-600 mt-0.5">
                    {lowStock.length} ingredients need attention
                  </p>
                </div>
              </div>

              <Link
                to="/admin/inventory"
                className="text-sm font-semibold text-red-700 hover:text-red-900 underline"
              >
                Manage Inventory →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between gap-3 bg-white border border-red-100 rounded-xl p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-ink truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-mute mt-1">
                      Remaining quantity
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="card p-5 sm:p-6">
        <ChartHeader
          title="Revenue Analytics"
          subtitle="Daily revenue performance over the last 30 days"
          icon="📈"
        />

        {dailySales.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-3">📊</span>
            <p className="font-medium text-ink">No sales data yet</p>
            <p className="text-sm text-mute mt-1">
              Revenue data will appear once orders are completed.
            </p>
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailySales}
                margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e5d8"
                  vertical={false}
                />

                <XAxis
                  dataKey="_id"
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${value}`}
                  width={65}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e5d8',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  }}
                  formatter={(value) => [
                    `₹${Number(value).toLocaleString('en-IN')}`,
                    'Revenue',
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1f5c3a"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#1f5c3a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Secondary Analytics */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Top Selling Pizzas */}
        <div className="card p-5 sm:p-6">
          <ChartHeader
            title="Top Selling Pizzas"
            subtitle="Best performing pizzas by quantity sold"
            icon="🏆"
          />

          {topPizzas.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-3">🍕</span>
              <p className="font-medium text-ink">No pizza sales yet</p>
              <p className="text-sm text-mute mt-1">
                Sales rankings will appear here.
              </p>
            </div>
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPizzas}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 5, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e5d8"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="_id"
                    width={110}
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e5d8',
                    }}
                  />

                  <Bar
                    dataKey="qty"
                    name="Quantity Sold"
                    fill="#1f5c3a"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order Status */}
        <div className="card p-5 sm:p-6">
          <ChartHeader
            title="Order Status"
            subtitle="Distribution of orders by current status"
            icon="📋"
          />

          {statusDist.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-3">📦</span>
              <p className="font-medium text-ink">No orders yet</p>
              <p className="text-sm text-mute mt-1">
                Order statistics will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {statusDist.map((status) => {
                const percentage = totalStatusOrders
                  ? (status.count / totalStatusOrders) * 100
                  : 0;

                const color =
                  statusColors[status._id?.toLowerCase()] || 'bg-basil';

                return (
                  <div key={status._id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <span className="text-sm font-medium text-ink capitalize">
                          {status._id}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-ink text-sm">
                          {status.count}
                        </span>
                        <span className="text-xs text-mute ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 rounded-full bg-paper overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 mt-4 border-t border-line flex justify-between">
                <span className="text-sm text-mute">Total Orders</span>
                <span className="font-bold text-ink">
                  {totalStatusOrders}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-mute px-1">
        <p>Restaurant Management Dashboard</p>
        <p>Business Analytics & Performance Overview</p>
      </div>

    </div>
  );
}
