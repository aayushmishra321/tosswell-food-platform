
import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

const CATS = {
  base: 'Pizza Bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  veggie: 'Vegetables',
};

function StockRow({ item, onSaved }) {
  const [stock, setStock] = useState(item.stock);
  const [threshold, setThreshold] = useState(item.threshold);
  const [busy, setBusy] = useState(false);

  const dirty = stock !== item.stock || threshold !== item.threshold;
  const low = item.stock < item.threshold;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(
        `/admin/inventory/${item._id}`,
        { stock, threshold }
      );
      onSaved(data);
      toast.success(`${item.name} updated`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="group border-t border-line hover:bg-paper/70 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3 min-w-[160px]">
          <div className="w-9 h-9 rounded-lg bg-paper flex items-center justify-center text-lg">
            {item.category === 'base' ? '🍕' :
             item.category === 'sauce' ? '🥫' :
             item.category === 'cheese' ? '🧀' : '🥬'}
          </div>
          <div>
            <p className="font-semibold text-ink">{item.name}</p>
            <p className="text-xs text-mute mt-0.5">Ingredient</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 whitespace-nowrap">
        <span className="px-3 py-1 rounded-full bg-paper text-mute text-xs font-medium capitalize">
          {item.category}
        </span>
      </td>

      <td className="px-5 py-4">
        <input
          type="number"
          min="0"
          className="input-sm !w-24 text-center"
          value={Number.isNaN(stock) ? '' : stock}
          onChange={(e) => setStock(e.target.valueAsNumber)}
        />
      </td>

      <td className="px-5 py-4">
        <input
          type="number"
          min="0"
          className="input-sm !w-24 text-center"
          value={Number.isNaN(threshold) ? '' : threshold}
          onChange={(e) => setThreshold(e.target.valueAsNumber)}
        />
      </td>

      <td className="px-5 py-4 whitespace-nowrap">
        <span className="font-semibold text-ink">₹{item.price}</span>
      </td>

      <td className="px-5 py-4">
        {low ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Low Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            In Stock
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <button
          className="btn-sm min-w-[76px]"
          disabled={!dirty || busy || Number.isNaN(stock) || Number.isNaN(threshold) || stock < 0 || threshold < 0}
          onClick={save}
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/inventory')
      .then((r) => setItems(r.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  const replace = (updated) =>
    setItems((all) =>
      all.map((i) => i._id === updated._id ? updated : i)
    );

  const filtered = items?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = items?.filter(
    (i) => i.stock < i.threshold
  ).length || 0;

  const totalItems = items?.length || 0;
  const healthyCount = totalItems - lowCount;

  return (
    <div className="space-y-7 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mute font-semibold mb-2">
            Management / Inventory
          </p>
          <h1 className="text-3xl font-bold text-ink">Inventory</h1>
          <p className="text-sm text-mute mt-1">
            Monitor ingredient levels and manage stock quantities.
          </p>
        </div>

        <div className="text-sm text-mute bg-paper border border-line rounded-xl px-4 py-3">
          Last updated inventory
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-mute">Total Ingredients</p>
          <div className="flex items-end justify-between mt-3">
            <h2 className="text-3xl font-bold text-ink">{totalItems}</h2>
            <span className="text-2xl">📦</span>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm text-mute">Healthy Stock</p>
          <div className="flex items-end justify-between mt-3">
            <h2 className="text-3xl font-bold text-green-600">{healthyCount}</h2>
            <span className="text-2xl">✓</span>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm text-mute">Low Stock Alerts</p>
          <div className="flex items-end justify-between mt-3">
            <h2 className="text-3xl font-bold text-red-500">{lowCount}</h2>
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">

        <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Stock Overview</h2>
            <p className="text-sm text-mute mt-1">
              {filtered?.length || 0} ingredients displayed
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute">
              🔍
            </span>
            <input
              className="input pl-10 w-full"
              placeholder="Search ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-4">
            <p className="msg-error">{error}</p>
          </div>
        )}

        {!filtered ? (
          <div className="p-5">
            <div className="skeleton h-64 rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-semibold text-ink">No ingredients found</h3>
            <p className="text-sm text-mute mt-1">
              Try searching with a different name.
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {Object.entries(CATS).map(([cat, label]) => {
              const rows = filtered.filter(
                (i) => i.category === cat
              );

              if (!rows.length) return null;

              return (
                <div key={cat} className="border border-line rounded-xl overflow-hidden">

                  {/* Category Header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-paper">
                    <div>
                      <h3 className="font-semibold text-ink">{label}</h3>
                      <p className="text-xs text-mute mt-1">
                        Manage {label.toLowerCase()} stock
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-mute bg-white border border-line rounded-full px-3 py-1">
                      {rows.length} items
                    </span>
                  </div>

                  {/* Responsive Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-white text-xs uppercase tracking-wider text-mute">
                          <th className="px-5 py-4 font-semibold">Ingredient</th>
                          <th className="px-5 py-4 font-semibold">Category</th>
                          <th className="px-5 py-4 font-semibold">In Stock</th>
                          <th className="px-5 py-4 font-semibold">Alert Below</th>
                          <th className="px-5 py-4 font-semibold">Price</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 text-right font-semibold">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-line">
                        {rows.map((item) => (
                          <StockRow
                            key={item._id}
                            item={item}
                            onSaved={replace}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered?.length > 0 && (
          <div className="px-5 py-4 border-t border-line bg-paper/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-mute">
              Showing {filtered.length} of {totalItems} ingredients
            </p>
            <p className="text-xs text-mute">
              Edit stock quantities and click Save to update.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
