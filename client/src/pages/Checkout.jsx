
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(s);
  });
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-11 h-11 rounded-xl bg-paper flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        {subtitle && (
          <p className="text-xs text-mute mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function Checkout() {
  const { lines, setQty, remove, clear, total: cartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [loyalty, setLoyalty] = useState(null);
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => {
    api.get('/addresses').then((r) => {
      setAddresses(r.data);
      const def = r.data.find((a) => a.isDefault);
      if (def) setSelectedAddress(def._id);
    }).catch(() => {});

    api.get('/coupons')
      .then((r) => setCoupons(r.data))
      .catch(() => {});

    api.get('/loyalty')
      .then((r) => setLoyalty(r.data))
      .catch(() => {});
  }, []);

  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const discount = appliedCoupon?.discount || 0;

  const pointsDiscount = usePoints && loyalty
    ? Math.min(loyalty.redeemValue, cartTotal - discount)
    : 0;

  const finalTotal = cartTotal - discount - pointsDiscount;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;

    setCouponBusy(true);
    setCouponError('');

    try {
      const { data } = await api.post('/coupons/validate', {
        code: couponInput.trim(),
        subtotal: cartTotal,
      });

      setAppliedCoupon(data);
      toast.success(`Coupon applied! You save ₹${data.discount}`);
    } catch (e) {
      setCouponError(errMsg(e));
      setAppliedCoupon(null);
    } finally {
      setCouponBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);

    try {
      const payload = lines.map((l) =>
        l.type === 'preset'
          ? {
              type: 'preset',
              pizzaId: l.pizzaId,
              qty: l.qty,
            }
          : {
              type: 'custom',
              base: l.base,
              sauce: l.sauce,
              cheese: l.cheese,
              veggies: l.veggies,
              qty: l.qty,
            }
      );

      const { data } = await api.post('/orders', {
        lines: payload,
        couponCode: appliedCoupon?.code,
        addressId: selectedAddress || undefined,
        pointsUsed: usePoints && loyalty ? loyalty.points : 0,
      });

      await loadRazorpay();

      new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: 'Tosswell Pizza',

        prefill: {
          name: user.name,
          email: user.email,
        },

        theme: {
          color: '#1f5c3a',
        },

        handler: async (response) => {
          try {
            await api.post('/orders/verify', {
              orderId: data.orderId,
              ...response,
            });

            clear();
            toast.success('Order confirmed! 🍕');
            navigate('/orders');
          } catch (e) {
            toast.error(errMsg(e));
            setBusy(false);
          }
        },

        modal: {
          ondismiss: () => setBusy(false),
        },
      }).open();

    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  if (!lines.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="card max-w-xl mx-auto p-8 sm:p-12 text-center">
          <div className="w-24 h-24 rounded-full bg-paper flex items-center justify-center text-5xl mx-auto mb-6">
            🛒
          </div>

          <h1 className="text-3xl font-bold text-ink mb-3">
            Your Cart is Empty
          </h1>

          <p className="text-sm text-mute mb-7">
            Looks like you haven't added anything delicious yet.
            Explore our menu and find your perfect pizza!
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/menu" className="btn">
              Explore Menu 🍕
            </Link>

            <Link to="/build" className="btn-quiet border border-line">
              Build Your Own
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">

      {/* Page Header */}
      <div className="bg-paper border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-9 sm:py-11">

          <p className="text-xs uppercase tracking-widest font-semibold text-basil mb-3">
            Your Order / Checkout
          </p>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink mb-2">
                Secure Checkout
              </h1>

              <p className="text-sm text-mute">
                Just a few more steps before your delicious pizza arrives.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-line rounded-xl px-4 py-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-xs font-bold text-ink">Secure Payment</p>
                <p className="text-[10px] text-mute">Powered by Razorpay</p>
              </div>
            </div>
          </div>

          {/* Checkout Progress */}
          <div className="flex items-center gap-2 sm:gap-4 mt-8 max-w-lg">
            {[
              { label: 'Cart', icon: '✓', active: true },
              { label: 'Checkout', icon: '2', active: true },
              { label: 'Payment', icon: '3', active: false },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center flex-1 gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.active
                    ? 'bg-basil text-white'
                    : 'bg-white border border-line text-mute'
                }`}>
                  {s.icon}
                </div>

                <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                  s.active ? 'text-basil' : 'text-mute'
                }`}>
                  {s.label}
                </span>

                {i !== 2 && (
                  <div className={`h-0.5 flex-1 min-w-2 ${
                    i === 0 ? 'bg-basil' : 'bg-line'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Checkout */}
      <div className="max-w-6xl mx-auto px-4 pt-8">

        <div className="grid gap-7 lg:grid-cols-[1fr_350px] items-start">

          {/* LEFT COLUMN */}
          <main className="space-y-6 min-w-0">

            {/* Cart Items */}
            <section className="card overflow-hidden">

              <div className="p-5 border-b border-line flex items-center justify-between">
                <SectionHeader
                  icon="🍕"
                  title="Your Order"
                  subtitle={`${itemCount} items in your cart`}
                />

                <span className="text-xs font-semibold text-basil bg-basil/10 rounded-full px-3 py-1.5 mb-5">
                  {itemCount} Items
                </span>
              </div>

              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <li
                    key={l.key}
                    className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4"
                  >
                    <PizzaImage
                      src={l.imageUrl}
                      alt={l.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl"
                      aspectRatio=""
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base text-ink truncate">
                        {l.name}
                      </p>

                      {l.type === 'custom' && (
                        <p className="text-xs text-mute mt-1 line-clamp-2">
                          {[l.base, l.sauce, l.cheese, ...(l.veggies || [])].filter(Boolean).join(', ')}
                        </p>
                      )}

                      <p className="text-sm font-semibold text-basil mt-2">
                        ₹{l.price}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center border border-line rounded-lg overflow-hidden">
                        <button
                          className="w-8 h-8 hover:bg-paper text-ink font-semibold"
                          onClick={() => setQty(l.key, l.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <span className="w-8 text-center text-sm font-bold">
                          {l.qty}
                        </span>

                        <button
                          className="w-8 h-8 hover:bg-paper text-ink font-semibold"
                          onClick={() => setQty(l.key, l.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <p className="font-bold text-sm text-ink">
                        ₹{l.price * l.qty}
                      </p>

                      <button
                        onClick={() => remove(l.key)}
                        className="text-xs text-mute hover:text-tomato transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="p-4 bg-paper/50 border-t border-line flex items-center justify-between">
                <Link
                  to="/menu"
                  className="text-sm font-semibold text-basil hover:underline"
                >
                  ← Continue Shopping
                </Link>

                <span className="text-sm text-mute">
                  Subtotal: <strong className="text-ink">₹{cartTotal}</strong>
                </span>
              </div>
            </section>

            {/* Delivery Address */}
            <section className="card p-5 sm:p-6">

              <SectionHeader
                icon="📍"
                title="Delivery Address"
                subtitle="Where should we deliver your pizza?"
              />

              {addresses.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {addresses.map((a) => {
                      const selected = selectedAddress === a._id;

                      return (
                        <label
                          key={a._id}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selected
                              ? 'border-basil bg-basil/5'
                              : 'border-line hover:border-basil/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryAddress"
                            value={a._id}
                            checked={selected}
                            onChange={() => setSelectedAddress(a._id)}
                            className="accent-basil w-4 h-4 mt-1 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-sm text-ink">
                                {a.label}
                              </p>

                              {a.isDefault && (
                                <span className="text-[10px] font-bold text-basil bg-basil/10 px-2 py-1 rounded-full">
                                  DEFAULT
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-mute leading-relaxed">
                              {a.line1}, {a.city} - {a.pincode}
                            </p>
                          </div>

                          {selected && (
                            <span className="text-basil text-lg">✓</span>
                          )}
                        </label>
                      );
                    })}

                    <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${
                      !selectedAddress
                        ? 'border-basil bg-basil/5'
                        : 'border-line'
                    }`}>
                      <input
                        type="radio"
                        name="deliveryAddress"
                        value=""
                        checked={!selectedAddress}
                        onChange={() => setSelectedAddress('')}
                        className="accent-basil"
                      />
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          Pickup / No delivery address
                        </p>
                        <p className="text-xs text-mute mt-1">
                          Continue without selecting a delivery address.
                        </p>
                      </div>
                    </label>
                  </div>

                  <Link
                    to="/addresses"
                    className="inline-flex text-sm font-semibold text-basil hover:underline mt-5"
                  >
                    + Manage Addresses
                  </Link>
                </>
              ) : (
                <div className="rounded-xl bg-paper p-5 text-center">
                  <span className="text-3xl">🏠</span>

                  <p className="font-semibold text-ink mt-3">
                    No saved addresses
                  </p>

                  <p className="text-xs text-mute mt-1 mb-4">
                    Add your address for a convenient delivery experience.
                  </p>

                  <Link to="/addresses" className="btn inline-flex">
                    Add Address
                  </Link>
                </div>
              )}
            </section>

            {/* Coupon */}
            <section className="card p-5 sm:p-6">

              <SectionHeader
                icon="🎟️"
                title="Offers & Coupons"
                subtitle="Save more on your favourite pizzas"
              />

              {appliedCoupon ? (
                <div className="rounded-xl border border-basil/30 bg-basil/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0">
                        🎉
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-basil">
                          Coupon Applied!
                        </p>

                        <p className="text-xs text-mute mt-1">
                          {appliedCoupon.code} · You saved ₹{discount}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput('');
                      }}
                      className="text-xs font-semibold text-tomato hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">

                  {coupons.length > 0 && (
                    <div>
                      <label className="text-xs text-mute font-semibold block mb-2">
                        AVAILABLE OFFERS
                      </label>

                      <div className="space-y-2">
                        {coupons.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setCouponInput(c.code);
                              setCouponError('');
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              couponInput === c.code
                                ? 'border-basil bg-basil/5'
                                : 'border-line hover:border-basil/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-mono font-bold text-sm text-basil">
                                  {c.code}
                                </p>

                                <p className="text-xs text-mute mt-1">
                                  {c.type === 'percent' || c.type === 'percentage'
                                    ? `${c.value}% discount`
                                    : `₹${c.value} discount`}
                                  {c.minOrder > 0 && ` · Min order ₹${c.minOrder}`}
                                </p>
                              </div>

                              <span className="text-xs font-semibold text-basil">
                                {couponInput === c.code ? '✓ Selected' : 'Select'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-mute font-semibold block mb-2">
                      ENTER COUPON CODE
                    </label>

                    <div className="flex gap-2">
                      <input
                        className="input flex-1 min-w-0 uppercase"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      />

                      <button
                        className="btn whitespace-nowrap"
                        disabled={couponBusy || !couponInput.trim()}
                        onClick={applyCoupon}
                      >
                        {couponBusy ? 'Applying...' : 'Apply'}
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-xs text-tomato mt-2">
                        {couponError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Loyalty Points */}
            {loyalty && loyalty.points > 0 && (
              <section className="card p-5 sm:p-6">

                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shrink-0">
                    🏅
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink">
                      Loyalty Rewards
                    </h3>

                    <p className="text-xs text-mute mt-1">
                      You have {loyalty.points} points worth ₹{loyalty.redeemValue}.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 mt-5 p-4 rounded-xl border border-line hover:border-basil/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="accent-basil w-4 h-4"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                  />

                  <div className="flex-1">
                    <p className="font-semibold text-sm text-ink">
                      Redeem my points
                    </p>
                    <p className="text-xs text-mute mt-1">
                      Save up to ₹{Math.max(0, Math.min(loyalty.redeemValue, cartTotal - discount))}
                    </p>
                  </div>

                  {usePoints && (
                    <span className="text-xs font-bold text-basil">
                      Applied ✓
                    </span>
                  )}
                </label>
              </section>
            )}
          </main>

          {/* RIGHT COLUMN - PRICE SUMMARY */}
          <aside className="lg:sticky lg:top-24 space-y-5">

            <section className="card overflow-hidden">

              <div className="p-5 border-b border-line bg-paper">
                <h2 className="text-lg font-bold text-ink">
                  Order Summary
                </h2>

                <p className="text-xs text-mute mt-1">
                  Review your order before payment.
                </p>
              </div>

              <div className="p-5 space-y-5">

                {/* Items Summary */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-mute">Total Items</span>
                  <span className="text-sm font-semibold text-ink">
                    {itemCount} items
                  </span>
                </div>

                <div className="space-y-3">
                  {lines.map((l) => (
                    <div
                      key={l.key}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="text-mute min-w-0 truncate">
                        {l.qty} × {l.name}
                      </span>

                      <span className="font-semibold text-ink whitespace-nowrap">
                        ₹{l.price * l.qty}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line" />

                {/* Price Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mute">Subtotal</span>
                    <span className="font-medium text-ink">
                      ₹{cartTotal}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-basil">
                      <span>Coupon Discount</span>
                      <span className="font-semibold">
                        -₹{discount}
                      </span>
                    </div>
                  )}

                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-basil">
                      <span>Loyalty Rewards</span>
                      <span className="font-semibold">
                        -₹{pointsDiscount}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-mute">Delivery Charges</span>
                    <span className="text-basil font-semibold">
                      FREE
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-line pt-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">
                      Total Payable
                    </span>

                    <span className="text-2xl font-extrabold text-basil">
                      ₹{finalTotal}
                    </span>
                  </div>

                  {(discount > 0 || pointsDiscount > 0) && (
                    <p className="text-xs text-green-700 mt-2 font-medium">
                      🎉 You saved ₹{discount + pointsDiscount} on this order!
                    </p>
                  )}
                </div>

                {/* Payment Button */}
                <button
                  className="btn w-full py-4 text-base font-bold flex items-center justify-center gap-2"
                  disabled={busy}
                  onClick={pay}
                >
                  {busy ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Opening Payment...
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      Pay ₹{finalTotal}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-mute">
                  <span>🔐</span>
                  Secure checkout powered by Razorpay
                </div>

                <div className="border-t border-line pt-4">
                  <Link
                    to="/menu"
                    className="btn-quiet w-full text-center text-sm block"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            </section>

            {/* Trust Card */}
            <div className="rounded-2xl bg-basil/5 border border-basil/15 p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm">
                Why Order With Us?
              </h3>

              {[
                ['🍕', 'Freshly Prepared', 'Made fresh for every order'],
                ['🛵', 'Fast Delivery', 'Delivered right to your door'],
                ['🔒', 'Secure Payments', 'Protected Razorpay checkout'],
              ].map(([icon, title, subtitle]) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {title}
                    </p>
                    <p className="text-xs text-mute mt-0.5">
                      {subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </aside>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs text-mute">
            Thank you for choosing Tosswell Pizza! 🍕
          </p>
        </div>
      </div>
    </div>
  );
}
