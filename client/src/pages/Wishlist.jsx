import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useCart } from '../cart';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const [items,  setItems]  = useState(null);
  const [error,  setError]  = useState('');
  const { add }  = useCart();
  const navigate = useNavigate();

  const load = () => api.get('/wishlist').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const remove = async (pizzaId) => {
    await api.delete(`/wishlist/${pizzaId}`).catch(() => {});
    setItems((prev) => prev.filter((p) => p._id !== pizzaId));
    toast.success('Removed from wishlist');
  };

  const addToCart = (p) => {
    add({ type: 'preset', pizzaId: p._id, name: p.name, price: p.price, imageUrl: p.image?.thumb || null });
    toast.success(`${p.name} added to cart!`);
    navigate('/cart');
  };

  if (error) return <div className="mx-auto max-w-4xl px-4 py-8"><p className="msg-error">{error}</p></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl mb-2">My Wishlist</h1>
      <p className="text-mute mb-6">Your saved favourites, ready to order anytime</p>

      {!items ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => <div key={i} className="card skeleton h-64" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">❤️</p>
          <p className="text-xl font-semibold mb-2">Your wishlist is empty</p>
          <p className="text-mute mb-6">Browse the menu and save your favourite pizzas</p>
          <Link to="/menu" className="btn">Browse Menu</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p._id} className="card-hover overflow-hidden">
              <div className="relative">
                <PizzaImage src={p.image?.url} alt={p.name} className="w-full" aspectRatio="aspect-[4/3]" />
                <button
                  onClick={() => remove(p._id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow text-tomato hover:bg-tomato hover:text-white transition-colors"
                  aria-label="Remove from wishlist"
                >✕</button>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold">{p.name}</h3>
                  <span className="font-bold text-basil shrink-0">₹{p.price}</span>
                </div>
                <p className="text-xs text-mute mb-3 line-clamp-2">{p.description}</p>
                <button onClick={() => addToCart(p)} disabled={!p.available} className="btn w-full">
                  {p.available ? 'Add to Cart' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
