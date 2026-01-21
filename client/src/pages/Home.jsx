
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { useCart } from '../cart';
import { useAuth } from '../auth';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-crust tracking-wide">
        {'★'.repeat(Math.round(rating))}
        {'☆'.repeat(5 - Math.round(rating))}
      </span>
      <span className="text-xs text-mute">({count} reviews)</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-basil mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
        {title}
      </h2>
      <p className="text-sm sm:text-base text-mute mt-3 max-w-xl">
        {subtitle}
      </p>
    </div>
  );
}

export default function Home() {
  const [menu, setMenu] = useState(null);
  const [reviews, setReviews] = useState([]);

  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/menu')
      .then((r) => setMenu(r.data))
      .catch(() => {});

    api.get('/reviews/recent')
      .then((r) => setReviews(r.data))
      .catch(() => {});
  }, []);

  const bestsellers = menu?.pizzas
    ? [...menu.pizzas]
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, 3)
    : [];

  const handleAdd = (p) => {
    if (!user) {
      navigate('/login');
      return;
    }

    add({
      type: 'preset',
      pizzaId: p._id,
      name: p.name,
      price: p.price,
      imageUrl: p.image?.thumb || null,
    });

    toast.success(`${p.name} added to cart!`);
  };

  return (
    <div className="overflow-x-hidden bg-white">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-[#142b20] text-white">

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-32 w-[500px] h-[500px] rounded-full bg-[#b58a43]/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 w-[450px] h-[450px] rounded-full bg-[#bd4638]/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '25px 25px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid md:grid-cols-2 items-center gap-12 lg:gap-16">

            {/* Hero Content */}
            <div className="text-center md:text-left">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-xs sm:text-sm text-white/80 mb-7">
                <span className="text-crust">✦</span>
                CRAFTED WITH LOVE, BAKED WITH PASSION
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-extrabold leading-[1.08] tracking-tight">
                A Little
                <br />
                Slice Of
                <br />
                <span className="text-[#e5b65c] italic">
                  Happiness.
                </span>
              </h1>

              <p className="text-white/65 text-base sm:text-lg leading-relaxed mt-7 max-w-lg mx-auto md:mx-0">
                Great pizza isn't just food. It's an experience.
                Discover handcrafted flavours made fresh, just the
                way you love them.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-9 justify-center md:justify-start">

                <Link
                  to="/menu"
                  className="inline-flex justify-center items-center gap-3 bg-[#c64d3c] hover:bg-[#ae3c2e] text-white font-bold px-7 py-4 rounded-xl transition-all shadow-lg shadow-black/10"
                >
                  Explore Menu
                  <span>→</span>
                </Link>

                <Link
                  to="/build"
                  className="inline-flex justify-center items-center gap-3 border border-white/25 hover:bg-white/10 text-white font-semibold px-7 py-4 rounded-xl transition-all"
                >
                  Build Your Pizza
                  <span>🍕</span>
                </Link>

              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center md:justify-start gap-x-7 gap-y-4 mt-10 pt-8 border-t border-white/10">
                <div>
                  <p className="text-[#e5b65c] font-bold text-xl">100%</p>
                  <p className="text-white/50 text-xs mt-1">Fresh ingredients</p>
                </div>

                <div>
                  <p className="text-[#e5b65c] font-bold text-xl">Made</p>
                  <p className="text-white/50 text-xs mt-1">Fresh to order</p>
                </div>

                <div>
                  <p className="text-[#e5b65c] font-bold text-xl">AI</p>
                  <p className="text-white/50 text-xs mt-1">Smart pizza builder</p>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-[85%] aspect-square rounded-full border border-white/10" />
              <div className="absolute w-[68%] aspect-square rounded-full border border-white/10" />

              <div className="relative w-full max-w-[460px] aspect-square">

                {bestsellers[0] ? (
                  <PizzaImage
                    src={bestsellers[0].image?.url}
                    alt={bestsellers[0].name}
                    className="w-full h-full rounded-full shadow-2xl ring-8 ring-white/10"
                    lazy={false}
                    aspectRatio=""
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-9xl">
                    🍕
                  </div>
                )}

                {/* Floating labels */}
                <div className="absolute -left-3 sm:-left-8 top-[18%] bg-white text-ink rounded-xl px-4 py-3 shadow-xl">
                  <p className="text-xs text-mute">Made with</p>
                  <p className="font-bold text-sm">Fresh Ingredients</p>
                  <p className="text-crust text-xs mt-1">★★★★★</p>
                </div>

                <div className="absolute -right-2 sm:-right-5 bottom-[15%] bg-[#e5b65c] text-[#142b20] rounded-xl px-4 py-3 shadow-xl">
                  <p className="text-xs font-medium">Your cravings,</p>
                  <p className="font-extrabold text-lg">Your Pizza!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROMO STRIP ================= */}
      <section className="bg-[#f8f3e9] border-b border-[#eee4d3]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
              🎁
            </div>

            <div>
              <p className="font-bold text-ink text-sm">
                A delicious welcome awaits!
              </p>
              <p className="text-xs text-mute mt-1">
                Use WELCOME15 for 15% off your first order.
              </p>
            </div>
          </div>

          <Link
            to="/menu"
            className="text-sm font-bold text-basil hover:text-tomato transition-colors"
          >
          </Link>
        </div>
      </section>

      {/* ================= BESTSELLERS ================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">

          <SectionHeading
            eyebrow="CUSTOMER FAVOURITES"
            title="The Crowd Pleasers."
            subtitle="The pizzas everyone keeps coming back for. Find your next favourite."
          />

          <Link
            to="/menu"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-basil hover:text-tomato mb-10 transition-colors"
          >
            View Full Menu →
          </Link>
        </div>

        {!menu ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-96 rounded-2xl" />
            ))}
          </div>
        ) : bestsellers.length === 0 ? (
          <div className="text-center py-12 text-mute">
            No pizzas available right now. Check back soon!
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {bestsellers.map((p, i) => (
              <article
                key={p._id}
                className="group bg-white rounded-2xl border border-[#eeeae2] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >

                <div className="relative overflow-hidden bg-[#f7f3ec]">
                  <PizzaImage
                    src={p.image?.url}
                    alt={p.name}
                    className="w-full group-hover:scale-105 transition-transform duration-500"
                    aspectRatio="aspect-[4/3]"
                  />

                  {i === 0 && (
                    <span className="absolute top-4 left-4 bg-[#e5b65c] text-[#352817] px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      ★ Best Seller
                    </span>
                  )}

                  {p.isVeg && (
                    <span className="absolute top-4 right-4 bg-white/95 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-bold">
                      ● Pure Veg
                    </span>
                  )}
                </div>

                <div className="p-5">

                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-extrabold text-lg text-ink">
                      {p.name}
                    </h3>

                    <span className="text-lg font-extrabold text-basil whitespace-nowrap">
                      ₹{p.price}
                    </span>
                  </div>

                  <p className="text-sm text-mute leading-relaxed mt-2 min-h-[42px] line-clamp-2">
                    {p.description}
                  </p>

                  {p.rating > 0 && (
                    <div className="mt-3">
                      <StarRating
                        rating={p.rating}
                        count={p.reviewCount}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleAdd(p)}
                    className="w-full mt-5 rounded-xl bg-[#183d2a] hover:bg-[#c64d3c] text-white font-bold py-3.5 transition-colors"
                  >
                    Add to Cart <span className="ml-2">+</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="text-center mt-10 sm:hidden">
          <Link to="/menu" className="btn-outline">
            Explore Full Menu →
          </Link>
        </div>
      </section>

      {/* ================= CUSTOM PIZZA ================= */}
      <section className="bg-[#f8f5ee] py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">

          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-basil mb-3">
              THE ART OF CUSTOMIZATION
            </p>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
              Your Pizza. Your Rules.
            </h2>

            <p className="text-sm text-mute mt-3 max-w-lg mx-auto">
              Start with your favourite base and build something
              extraordinary, one ingredient at a time.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

            {[
              {
                emoji: '🍞',
                title: 'The Base',
                desc: 'Start with the perfect crust.',
                number: '01',
              },
              {
                emoji: '🍅',
                title: 'The Sauce',
                desc: 'Choose your flavour foundation.',
                number: '02',
              },
              {
                emoji: '🧀',
                title: 'The Cheese',
                desc: 'Make every bite creamy.',
                number: '03',
              },
              {
                emoji: '🥦',
                title: 'The Toppings',
                desc: 'Finish with your favourites.',
                number: '04',
              },
            ].map((item) => (
              <Link
                key={item.title}
                to="/build"
                className="group relative bg-white border border-[#eee7da] rounded-2xl p-5 sm:p-7 hover:shadow-lg hover:border-basil/30 transition-all duration-300"
              >
                <span className="text-xs font-bold text-basil/40 tracking-widest">
                  {item.number}
                </span>

                <div className="text-5xl my-6 group-hover:scale-110 transition-transform duration-300">
                  {item.emoji}
                </div>

                <h3 className="font-extrabold text-ink text-lg">
                  {item.title}
                </h3>

                <p className="text-xs text-mute mt-2 leading-relaxed">
                  {item.desc}
                </p>

                <div className="mt-5 text-xs font-bold text-basil group-hover:text-tomato transition-colors">
                  Customize →
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/build" className="btn px-8 py-4">
              Create Your Masterpiece 🍕
            </Link>
          </div>
        </div>
      </section>

      {/* ================= TOSSY AI ================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">

        <div className="relative overflow-hidden rounded-[28px] bg-[#183d2a] text-white">

          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-[#e5b65c]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-[#c64d3c]/15 blur-3xl" />

          <div className="relative grid md:grid-cols-2 gap-10 items-center p-7 sm:p-12 lg:p-16">

            <div>
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-xs font-bold text-[#e5b65c]">
                ✨ YOUR PERSONAL PIZZA ASSISTANT
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold mt-6 leading-tight">
                Meet Tossy.
                <br />
                <span className="text-[#e5b65c] italic">
                  Your AI Pizza Chef.
                </span>
              </h2>

              <p className="text-white/65 leading-relaxed mt-5 max-w-lg">
                Can't decide what to eat? Tell Tossy what you're
                craving, your favourite ingredients or your budget.
                Let AI find the perfect pizza for you.
              </p>

              <div className="flex flex-wrap gap-2 mt-6">
                {['🌶️ Spicy', '🧀 Extra Cheesy', '🥗 Veggie', '💰 Budget Friendly'].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-white/10 border border-white/10 rounded-full px-3 py-2 text-white/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                className="mt-8 bg-[#e5b65c] hover:bg-[#f0ca7e] text-[#183d2a] font-extrabold rounded-xl px-7 py-4 transition-colors"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }

                  window.dispatchEvent(new CustomEvent('tossy:open'));
                }}
              >
                Chat With Tossy 🤖
                <span className="ml-3">→</span>
              </button>
            </div>

            <div className="relative flex justify-center">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <div className="text-[120px] sm:text-[160px]">
                  🤖
                </div>
              </div>

              <div className="absolute top-8 right-0 sm:right-8 bg-white text-ink rounded-xl p-3 shadow-xl rotate-3">
                <p className="text-xs font-bold">Hey there! 👋</p>
                <p className="text-[10px] text-mute mt-1">
                  What's your craving today?
                </p>
              </div>

              <div className="absolute bottom-8 left-0 sm:left-4 bg-[#e5b65c] text-[#183d2a] rounded-xl px-4 py-3 shadow-xl -rotate-3">
                <p className="text-xs font-extrabold">
                  Let's make pizza magic! 🍕
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= CUSTOMER REVIEWS ================= */}
      {reviews.length > 0 && (
        <section className="bg-[#f8f5ee] py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">

            <div className="text-center mb-12">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-basil mb-3">
                WORDS FROM OUR CUSTOMERS
              </p>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
                Made With Love. Loved By You.
              </h2>

              <p className="text-sm text-mute mt-3">
                Here's what our pizza lovers have to say.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {reviews.slice(0, 3).map((r) => (
                <article
                  key={r._id}
                  className="bg-white rounded-2xl border border-[#eee7da] p-6 sm:p-7 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-crust text-lg tracking-wider">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </div>

                    <span className="text-3xl text-[#e9e1d3]">“</span>
                  </div>

                  <p className="text-sm text-ink leading-relaxed min-h-[85px]">
                    {r.comment || 'Absolutely delicious! Loved every bite.'}
                  </p>

                  <div className="border-t border-line mt-6 pt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-basil/10 flex items-center justify-center font-bold text-basil">
                      {(r.user?.name || 'H').charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <p className="font-bold text-sm text-ink">
                        {r.user?.name || 'Happy Customer'}
                      </p>
                      <p className="text-xs text-mute mt-1">
                        Verified customer
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= LOYALTY PROGRAM ================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">

        <div className="relative overflow-hidden rounded-[28px] bg-[#f4ead8] border border-[#e9dbc1] p-8 sm:p-12 lg:p-16">

          <div className="absolute -right-16 -top-16 text-[220px] opacity-[0.07] pointer-events-none">
            🏆
          </div>

          <div className="relative text-center max-w-3xl mx-auto">

            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-sm mb-6">
              🏅
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-basil mb-3">
              THE MORE YOU ORDER, THE MORE YOU EARN
            </p>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-ink">
              Good Pizza.
              <br />
              Even Better Rewards.
            </h2>

            <p className="text-sm sm:text-base text-mute mt-5 max-w-xl mx-auto leading-relaxed">
              Earn 1 point for every ₹10 spent. Redeem your points
              for discounts and unlock exclusive Bronze, Silver
              and Gold membership rewards.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-5 mt-10">

              {[
                ['🥉', 'Bronze', '0 points'],
                ['🥈', 'Silver', '500 points'],
                ['🥇', 'Gold', '1500 points'],
              ].map(([emoji, tier, points]) => (
                <div
                  key={tier}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"
                >
                  <div className="text-3xl sm:text-4xl mb-3">
                    {emoji}
                  </div>

                  <p className="font-extrabold text-ink text-sm sm:text-base">
                    {tier}
                  </p>

                  <p className="text-[10px] sm:text-xs text-mute mt-1">
                    {points}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to={user ? '/account' : '/register'}
              className="inline-flex items-center gap-3 mt-9 bg-[#183d2a] hover:bg-[#c64d3c] text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              {user ? 'View My Rewards' : 'Join Our Rewards Club'}
              →
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="bg-[#142b20] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-16 text-center">

          <p className="text-xs uppercase tracking-[0.2em] text-[#e5b65c] font-bold mb-4">
            YOUR NEXT FAVOURITE IS WAITING
          </p>

          <h2 className="text-3xl sm:text-5xl font-extrabold">
            Happiness Is Just
            <span className="text-[#e5b65c] italic"> One Slice </span>
            Away.
          </h2>

          <p className="text-white/60 text-sm sm:text-base mt-5">
            Freshly baked, full of flavour and made just for you.
          </p>

          <Link
            to="/menu"
            className="inline-flex items-center gap-3 mt-8 bg-[#c64d3c] hover:bg-[#ae3c2e] text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Order Your Pizza Now 🍕
            →
          </Link>
        </div>
      </section>

    </div>
  );
}
