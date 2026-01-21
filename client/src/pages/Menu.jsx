import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useCart } from '../cart';
import { useAuth } from '../auth';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

function Stars({ rating, count }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))}</span>
      <span className="text-mute">({count})</span>
    </span>
  );
}

function PizzaModal({ pizza, onClose, onAdd }) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api.get(`/reviews/pizza/${pizza._id}`).then((r) => setReviews(r.data)).catch(() => {});
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [pizza._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <PizzaImage src={pizza.image?.url} alt={pizza.name} className="w-full" aspectRatio="aspect-[16/9]" lazy={false} />
          <button onClick={onClose} className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">✕</button>
          {pizza.isVeg && <span className="absolute top-3 left-3 badge badge-green">🌿 Veg</span>}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-2xl">{pizza.name}</h2>
            <span className="text-2xl font-bold text-basil shrink-0">₹{pizza.price}</span>
          </div>
          {pizza.rating > 0 && <Stars rating={pizza.rating} count={pizza.reviewCount} />}
          <p className="text-mute mt-2 mb-4">{pizza.description}</p>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute mb-2">Ingredients</p>
            <div className="flex flex-wrap gap-2">
              {[pizza.base, pizza.sauce, pizza.cheese, ...pizza.veggies].filter(Boolean).map((i) => (
                <span key={i} className="badge badge-gray">{i}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { onAdd(pizza); onClose(); }} disabled={!pizza.available} className="btn flex-1">
              {pizza.available ? 'Add to Cart' : 'Sold Out'}
            </button>
          </div>
          {reviews.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="font-semibold mb-3">Customer Reviews</p>
              <div className="space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <div key={r._id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="stars text-xs">{'★'.repeat(r.rating)}</span>
                      <span className="font-medium">{r.user?.name}</span>
                    </div>
                    {r.comment && <p className="text-mute">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Menu() {
  const [menu, setMenu]       = useState(null);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sort, setSort]       = useState('default');
  const [selected, setSelected] = useState(null);
  const [wishlist, setWishlist] = useState(new Set()); // set of pizzaId strings
  const { add }    = useCart();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    api.get('/menu').then((r) => setMenu(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  // Load wishlist ids for the heart icon state
  useEffect(() => {
    if (!user) return;
    api.get('/wishlist')
      .then((r) => setWishlist(new Set(r.data.map((p) => p._id))))
      .catch(() => {});
  }, [user]);

  const toggleWishlist = async (e, p) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      await api.post(`/wishlist/${p._id}`);
      setWishlist((prev) => {
        const next = new Set(prev);
        if (next.has(p._id)) { next.delete(p._id); toast('Removed from wishlist'); }
        else                  { next.add(p._id);    toast.success('Added to wishlist ❤️'); }
        return next;
      });
    } catch (e) { toast.error(errMsg(e)); }
  };

  const handleAdd = (p) => {
    if (!user) { navigate('/login'); return; }
    add({ type: 'preset', pizzaId: p._id, name: p.name, price: p.price, imageUrl: p.image?.thumb || null });
    toast.success(`${p.name} added!`);
  };

  const isAvailable = (p) => {
    if (!menu) return false;
    return [['base', p.base], ['sauce', p.sauce], ['cheese', p.cheese], ...p.veggies.map((v) => ['veggie', v])]
      .every(([c, n]) => menu.options[c]?.find((o) => o.name === n)?.inStock);
  };

  const filtered = useMemo(() => {
    if (!menu) return [];
    let list = [...menu.pizzas];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        [p.base, p.sauce, p.cheese, ...p.veggies].some((i) => i?.toLowerCase().includes(q))
      );
    }
    if (vegOnly) list = list.filter((p) => p.isVeg);
    if (sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'rating')     list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'popular')    list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    return list;
  }, [menu, search, vegOnly, sort]);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-8"><p className="msg-error">{error}</p></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl mb-2">Our Menu</h1>
        <p className="text-mute">Fresh pizzas baked to order. Add to cart and checkout when ready.</p>
      </div>

      {/* Filters bar */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder="Search pizzas, ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="default">Sort: Default</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Top Rated</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="accent-basil w-4 h-4" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
          <span className="text-sm font-medium">🌿 Veg only</span>
        </label>
      </div>

      {/* Grid */}
      {!menu ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="card skeleton h-80" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🍕</p>
          <p className="text-xl font-semibold mb-2">No pizzas found</p>
          <p className="text-mute mb-4">Try adjusting your search or filters</p>
          <button onClick={() => { setSearch(''); setVegOnly(false); setSort('default'); }} className="btn-quiet">Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const avail = isAvailable(p);
            return (
              <div key={p._id} className={`card-hover overflow-hidden flex flex-col ${!avail ? 'opacity-70' : ''}`}>
                <div className="relative cursor-pointer" onClick={() => setSelected(p)}>
                  <PizzaImage src={p.image?.url} alt={p.name} className="w-full" aspectRatio="aspect-[4/3]" />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {p.isVeg && <span className="badge badge-green text-xs">🌿 Veg</span>}
                    {(p.soldCount || 0) >= 10 && <span className="badge badge-yellow text-xs">🔥 Popular</span>}
                  </div>
                  {/* Wishlist heart button */}
                  <button
                    onClick={(e) => toggleWishlist(e, p)}
                    aria-label={wishlist.has(p._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    style={{
                      position: 'absolute', top: '0.75rem', right: '0.75rem',
                      width: '2rem', height: '2rem', borderRadius: '9999px',
                      background: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      color: wishlist.has(p._id) ? '#d13527' : '#5d6b62',
                      transition: 'color 0.15s, transform 0.1s',
                    }}
                  >
                    {wishlist.has(p._id) ? '❤️' : '🤍'}
                  </button>
                  {!avail && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="badge badge-red text-sm">Sold Out</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg leading-tight cursor-pointer hover:text-basil" onClick={() => setSelected(p)}>{p.name}</h3>
                    <span className="font-bold text-basil shrink-0">₹{p.price}</span>
                  </div>
                  {p.rating > 0 && <Stars rating={p.rating} count={p.reviewCount} />}
                  <p className="text-sm text-mute mt-1 mb-3 line-clamp-2 flex-1">{p.description}</p>
                  <p className="text-xs text-mute mb-3 line-clamp-1">{[p.base, p.sauce, p.cheese, ...p.veggies].join(', ')}</p>
                  <button onClick={() => handleAdd(p)} disabled={!avail} className="btn w-full">
                    {avail ? 'Add to Cart' : 'Sold Out'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <PizzaModal pizza={selected} onClose={() => setSelected(null)} onAdd={handleAdd} />}
    </div>
  );
}
