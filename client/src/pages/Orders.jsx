
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { getSocket } from '../socket';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

export const STAGES = [
  'Order Placed',
  'Payment Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
];

export function Tracker({ status }) {
  const at = STAGES.indexOf(status);

  if (status === 'Cancelled') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
        <span className="text-xl">❌</span>
        <div>
          <p className="font-semibold text-red-700 text-sm">Order Cancelled</p>
          <p className="text-xs text-red-500 mt-1">
            This order is no longer being processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-ink">Order Progress</p>
        <span className="text-xs text-basil font-semibold">
          {at >= 0 ? `${at + 1} of ${STAGES.length} stages` : 'Processing'}
        </span>
      </div>

      <ol className="flex gap-1" aria-label={`Status: ${status}`}>
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={`flex-1 min-w-0 border-t-[4px] pt-2 transition-colors ${
              i <= at ? 'border-basil' : 'border-line'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-2 ${
              i < at
                ? 'bg-basil text-white'
                : i === at
                  ? 'bg-basil text-white ring-4 ring-basil/10'
                  : 'bg-paper text-mute'
            }`}>
              {i < at ? '✓' : i + 1}
            </div>

            <p className={`text-[9px] sm:text-[11px] leading-tight font-medium break-words ${
              i <= at ? 'text-basil' : 'text-mute'
            }`}>
              {s}
              {i === at && <span className="sr-only"> (current)</span>}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewModal({ order, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/reviews', {
        orderId: order._id,
        rating,
        comment,
      });

      setSubmitted(true);
      toast.success('Review submitted!');
      setTimeout(onClose, 1500);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-5">🎉</div>
            <h2 className="text-2xl font-bold text-ink mb-2">
              Thank You!
            </h2>
            <p className="text-sm text-mute">
              Your feedback means a lot to us.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-basil font-semibold mb-2">
                  Customer Feedback
                </p>
                <h2 className="text-2xl font-bold text-ink">
                  Rate Your Order
                </h2>
                <p className="text-sm text-mute mt-1">
                  Order #{order._id.slice(-6).toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-paper text-mute hover:text-ink"
                aria-label="Close review"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-ink mb-3">
                  How would you rate your experience?
                </p>

                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`Rate ${n} stars`}
                      className={`text-4xl transition-all hover:scale-110 ${
                        n <= rating ? 'text-crust' : 'text-line'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <p className="text-xs text-mute mt-2">
                  {rating === 5 ? 'Excellent! ⭐' :
                   rating === 4 ? 'Very Good!' :
                   rating === 3 ? 'Good' :
                   rating === 2 ? 'Could be better' : 'Poor'}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">
                  Share your experience
                  <span className="font-normal text-mute"> (Optional)</span>
                </label>

                <textarea
                  className="input min-h-28 resize-y"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="How was your pizza? Tell us what you loved..."
                />

                <p className="text-right text-xs text-mute mt-1">
                  {comment.length}/1000
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="btn flex-1"
                  disabled={busy}
                >
                  {busy ? 'Submitting...' : 'Submit Review'}
                </button>

                <button
                  type="button"
                  className="btn-quiet flex-1 border border-line"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function OrderItem({ item }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PizzaImage
        src={item.imageUrl}
        alt={item.name}
        className="w-16 h-16 shrink-0 rounded-xl"
        aspectRatio=""
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink truncate">
          {item.name}
        </p>
        <p className="text-xs text-mute mt-1">
          Quantity: {item.qty}
        </p>
        <p className="text-xs text-mute mt-1">
          ₹{item.price} per item
        </p>
      </div>

      <p className="font-bold text-ink whitespace-nowrap">
        ₹{item.price * item.qty}
      </p>
    </li>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reordering, setReordering] = useState(null);

  const load = async (p = 1) => {
    try {
      const { data } = await api.get(`/orders/mine?page=${p}&limit=5`);
      setOrders(data.orders);
      setPages(data.pages);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  useEffect(() => {
    if (!user || !orders?.length) return;

    const token = localStorage.getItem('token');
    const socket = getSocket(token);

    const active = orders.filter(
      (o) => !['Delivered', 'Cancelled'].includes(o.status)
    );

    active.forEach((o) => socket.emit('joinOrder', o._id));

    const handleStatusUpdate = ({ orderId, status }) => {
      setOrders((prev) =>
        prev?.map((o) =>
          o._id === orderId ? { ...o, status } : o
        )
      );

      toast(`Order updated: ${status}`, { icon: '📦' });
    };

    socket.on('statusUpdate', handleStatusUpdate);

    return () => {
      active.forEach((o) => socket.emit('leaveOrder', o._id));
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [orders, user]);

  const reorder = async (orderId) => {
    setReordering(orderId);

    try {
      const { data } = await api.post(`/orders/${orderId}/reorder`);

      data.lines.forEach((l) => add(l));

      toast.success('Items added to cart!');
      navigate('/cart');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setReordering(null);
    }
  };

  if (!orders) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-5">
        <div className="skeleton h-24 rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!orders.length && page === 1) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="card max-w-xl mx-auto text-center p-8 sm:p-12">
          <div className="w-24 h-24 rounded-full bg-paper flex items-center justify-center text-5xl mx-auto mb-6">
            📦
          </div>

          <h1 className="text-3xl font-bold text-ink mb-3">
            No Orders Yet
          </h1>

          <p className="text-sm text-mute mb-7">
            Your delicious journey starts here! Explore our menu
            and order your favourite pizza.
          </p>

          <Link to="/menu" className="btn inline-flex">
            Explore Menu 🍕
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">

      {/* Header */}
      <div className="bg-paper border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-9 sm:py-11">
          <p className="text-xs uppercase tracking-widest font-semibold text-basil mb-3">
            Your Account / Order History
          </p>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink mb-2">
                My Orders
              </h1>

              <p className="text-sm text-mute">
                Track your deliveries and order your favourites again.
              </p>
            </div>

            <Link
              to="/menu"
              className="btn-quiet border border-line inline-flex items-center justify-center"
            >
              + Order Again
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8">

        {error && (
          <div className="mb-5">
            <p className="msg-error">{error}</p>
            <button
              className="text-sm text-basil underline mt-2"
              onClick={() => load(page)}
            >
              Try again
            </button>
          </div>
        )}

        {/* Order List */}
        <div className="space-y-6">
          {orders.map((o) => {
            const cancelled = o.status === 'Cancelled';
            const delivered = o.status === 'Delivered';

            return (
              <article
                key={o._id}
                className="card overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-4 sm:p-5 bg-paper border-b border-line">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-ink">
                          Order #{o._id.slice(-6).toUpperCase()}
                        </h2>

                        <span className={`badge ${
                          delivered
                            ? 'badge-green'
                            : cancelled
                              ? 'badge-red'
                              : 'badge-yellow'
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      <p className="text-xs text-mute mt-2">
                        Placed on {new Date(o.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-mute">Total Amount</p>
                      <p className="text-xl font-extrabold text-basil mt-1">
                        ₹{o.total}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-4 sm:p-5 space-y-5">

                  {/* Items */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-ink text-sm">
                        Order Items
                      </h3>

                      <span className="text-xs text-mute">
                        {o.items.length} items
                      </span>
                    </div>

                    <ul className="divide-y divide-line">
                      {o.items.map((item, i) => (
                        <OrderItem key={i} item={item} />
                      ))}
                    </ul>
                  </section>

                  {/* Payment Summary */}
                  <div className="rounded-xl bg-paper p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-mute">Payment Status</span>
                      <span className="font-semibold text-green-700">
                        ✓ Paid
                      </span>
                    </div>

                    {o.discount > 0 && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-mute">Discount Applied</span>
                        <span className="font-semibold text-basil">
                          -₹{o.discount}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-line pt-3 mt-3 flex justify-between items-center">
                      <span className="font-semibold text-ink">
                        Total Paid
                      </span>
                      <span className="text-xl font-extrabold text-basil">
                        ₹{o.total}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  {o.estimatedDelivery && !delivered && !cancelled && (
                    <div className="flex items-center gap-3 border border-line rounded-xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-paper flex items-center justify-center text-xl">
                        🛵
                      </div>

                      <div>
                        <p className="text-xs text-mute">
                          Estimated Delivery Time
                        </p>
                        <p className="font-semibold text-ink text-sm mt-1">
                          {new Date(o.estimatedDelivery).toLocaleTimeString(
                            'en-IN',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Tracker */}
                  <Tracker status={o.status} />

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-line">
                    <button
                      className="btn-quiet border border-line flex-1 text-sm"
                      onClick={() => reorder(o._id)}
                      disabled={reordering === o._id}
                    >
                      {reordering === o._id
                        ? 'Adding to cart...'
                        : '🔄 Reorder'}
                    </button>

                    {delivered && (
                      <button
                        className="btn flex-1 text-sm"
                        onClick={() => setReviewing(o)}
                      >
                        ⭐ Rate Your Order
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="card mt-7 p-4 flex items-center justify-between gap-3">
            <button
              className="btn-quiet border border-line text-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Previous
            </button>

            <span className="text-sm font-medium text-mute">
              Page {page} of {pages}
            </span>

            <button
              className="btn-quiet border border-line text-sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        )}

      </div>

      {/* Review Modal */}
      {reviewing && (
        <ReviewModal
          order={reviewing}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
