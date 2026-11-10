import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

export default function AiInsights() {
  const [insights,   setInsights]   = useState(null);
  const [forecast,   setForecast]   = useState(null);
  const [sentiment,  setSentiment]  = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [batchBusy,  setBatchBusy]  = useState(false);
  const [error,      setError]      = useState('');

  const loadInsights = () =>
    api.get('/ai/insights').then((r) => setInsights(r.data)).catch((e) => setError(errMsg(e)));

  const loadForecast = () =>
    api.get('/ai/forecast?days=14').then((r) => setForecast(r.data)).catch(() => {});

  const loadSentiment = () =>
    api.get('/admin/reviews').then((r) => {
      const counts = { Positive: 0, Neutral: 0, Negative: 0, unclassified: 0 };
      r.data.forEach((rev) => {
        if (rev.sentiment) counts[rev.sentiment]++;
        else counts.unclassified++;
      });
      setSentiment({ counts, total: r.data.length });
    }).catch(() => {});

  useEffect(() => {
    loadInsights();
    loadForecast();
    loadSentiment();
  }, []);

  const runBatchSentiment = async () => {
    setBatchBusy(true);
    try {
      const { data } = await api.post('/ai/sentiment/batch');
      toast.success(`Classified ${data.processed} reviews`);
      loadSentiment();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBatchBusy(false); }
  };

  const statusColor = { out: '#d13527', low: '#e2a93b', warning: '#e2a93b', ok: '#1f5c3a' };
  const statusLabel = { out: 'Out of Stock', low: 'Low Stock', warning: 'Runs Out Soon', ok: 'OK' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-1">AI Insights</h1>
        <p className="text-mute text-sm">Powered by Gemini · Data from last 30 days</p>
      </div>

      {error && <p className="msg-error">{error}</p>}

      {/* Business insights */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold">🤖 Business Insights</p>
          <button className="btn-sm" onClick={loadInsights} disabled={!insights}>Refresh</button>
        </div>
        {!insights ? (
          <div className="skeleton h-24 rounded-xl" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4 mb-4">
              {[
                ['Orders', insights.data?.totalOrders],
                ['Revenue', `₹${(insights.data?.totalRevenue || 0).toLocaleString('en-IN')}`],
                ['Avg Rating', insights.data?.avgRating],
                ['Low Stock', insights.data?.lowStockCount + ' items'],
              ].map(([l, v]) => (
                <div key={l} className="card p-3 text-center">
                  <p className="text-xs text-mute">{l}</p>
                  <p className="font-bold text-lg">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-basil/5 border border-basil/20 p-4">
              <p className="text-xs font-semibold text-basil uppercase tracking-wide mb-2">AI Analysis</p>
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{insights.insights}</pre>
              <p className="text-xs text-mute mt-2">Generated: {new Date(insights.generatedAt).toLocaleString()}</p>
            </div>
          </>
        )}
      </div>

      {/* Sentiment analysis */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold">⭐ Review Sentiment</p>
          <button className="btn-sm" onClick={runBatchSentiment} disabled={batchBusy}>
            {batchBusy ? 'Classifying…' : 'Classify Unclassified'}
          </button>
        </div>
        {!sentiment ? <div className="skeleton h-16 rounded-xl" /> : (
          <div className="flex flex-wrap gap-4">
            {[
              ['Positive', sentiment.counts.Positive, '#1f5c3a', 'bg-basil/10'],
              ['Neutral',  sentiment.counts.Neutral,  '#5d6b62', 'bg-line'],
              ['Negative', sentiment.counts.Negative, '#d13527', 'bg-tomato/10'],
              ['Unclassified', sentiment.counts.unclassified, '#5d6b62', 'bg-paper'],
            ].map(([label, count, color, bg]) => (
              <div key={label} className={`card ${bg} px-5 py-3 text-center`}>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-xs text-mute">{label}</p>
              </div>
            ))}
            <div className="card bg-paper px-5 py-3 text-center">
              <p className="text-2xl font-bold">{sentiment.total}</p>
              <p className="text-xs text-mute">Total reviews</p>
            </div>
          </div>
        )}
      </div>

      {/* Inventory forecast */}
      <div className="card p-5">
        <p className="font-semibold mb-4">📦 Inventory Forecast (next 14 days)</p>
        {!forecast ? <div className="skeleton h-32 rounded-xl" /> :
          forecast.insufficient ? (
            <div className="rounded-xl border border-crust/30 bg-crust/5 p-4 text-sm">
              <p className="font-semibold text-amber-700">⚠️ Insufficient data</p>
              <p className="text-mute mt-1">{forecast.message}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-mute">Based on {forecast.ordersAnalysed} orders over {forecast.daysAnalysed} days</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-mute uppercase bg-paper">
                      <th className="px-3 py-2 text-left font-medium">Ingredient</th>
                      <th className="px-3 py-2 text-left font-medium">Stock</th>
                      <th className="px-3 py-2 text-left font-medium">Avg/Day</th>
                      <th className="px-3 py-2 text-left font-medium">Days Left</th>
                      <th className="px-3 py-2 text-left font-medium">Restock</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {forecast.forecasts.map((f) => (
                      <tr key={f._id} className="hover:bg-paper">
                        <td className="px-3 py-2 font-medium">{f.name}</td>
                        <td className="px-3 py-2">{f.currentStock}</td>
                        <td className="px-3 py-2">{f.avgPerDay}</td>
                        <td className="px-3 py-2">{f.daysUntilStockout ?? '—'}</td>
                        <td className="px-3 py-2">{f.suggestedRestock > 0 ? `+${f.suggestedRestock}` : '—'}</td>
                        <td className="px-3 py-2">
                          <span className="badge" style={{ backgroundColor: statusColor[f.status] + '20', color: statusColor[f.status] }}>
                            {statusLabel[f.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}
