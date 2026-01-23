
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, errMsg } from '../api';
import { useCart } from '../cart';
import { useAuth } from '../auth';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'base', title: 'Choose a Base', icon: '🍞', subtitle: 'Start with your perfect crust' },
  { key: 'sauce', title: 'Choose a Sauce', icon: '🍅', subtitle: 'Add your favourite flavour' },
  { key: 'cheese', title: 'Choose a Cheese', icon: '🧀', subtitle: 'Make it extra delicious' },
  { key: 'veggie', title: 'Pick Vegetables', icon: '🥦', subtitle: 'Add your favourite toppings' },
];

const EXAMPLES = [
  'Spicy and cheesy',
  'Loaded with vegetables',
  'Classic Italian flavour',
  'Under ₹350',
];

export default function Builder() {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState({ base: '', sauce: '', cheese: '' });
  const [veggies, setVeggies] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/menu')
      .then((r) => setOptions(r.data.options))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="msg-error">{error}</p>
      </div>
    );
  }

  if (!options) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const { key, title, icon } = current;
  const last = step === STEPS.length - 1;

  const priceOf = (cat, name) =>
    options[cat]?.find((o) => o.name === name)?.price || 0;

  const price =
    priceOf('base', pick.base) +
    priceOf('sauce', pick.sauce) +
    priceOf('cheese', pick.cheese) +
    veggies.reduce((sum, v) => sum + priceOf('veggie', v), 0);

  const selectedCount =
    [pick.base, pick.sauce, pick.cheese].filter(Boolean).length +
    veggies.length;

  const canNext = last || Boolean(pick[key]);

  const toggle = (name) => {
    if (current.key === 'veggie') {
      setVeggies((vs) =>
        vs.includes(name)
          ? vs.filter((v) => v !== name)
          : [...vs, name]
      );
    } else {
      setPick((prev) => ({ ...prev, [key]: name }));
    }
  };

  const finish = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    add({
      type: 'custom',
      name: 'Custom Pizza',
      price,
      ...pick,
      veggies,
      imageUrl: null,
    });

    toast.success('Custom pizza added to cart!');
    navigate('/cart');
  };

  const aiSuggest = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);

    try {
      const { data } = await api.post('/ai/suggest-pizza', {
        preference: aiPrompt,
      });

      setPick({
        base: data.base,
        sauce: data.sauce,
        cheese: data.cheese,
      });

      setVeggies(data.veggies || []);
      setStep(STEPS.length - 1);

      toast.success(`AI built your pizza! ${data.reason || ''}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">

      {/* Page Header */}
      <div className="bg-paper border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-9 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-basil mb-3">
                <span className="w-2 h-2 rounded-full bg-basil" />
                Your Kitchen, Your Rules
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink mb-2">
                Build Your Pizza
              </h1>

              <p className="text-sm sm:text-base text-mute max-w-lg">
                Create a pizza that is uniquely yours. Choose every ingredient
                and make every bite count.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-mute bg-white border border-line rounded-xl px-4 py-3">
              <span className="text-xl">🍕</span>
              <span>100% Customizable</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-7 sm:pt-9">

        {/* AI Pizza Generator */}
        <section className="relative overflow-hidden rounded-2xl border border-basil/20 bg-basil/5 p-5 sm:p-7 mb-8">
          <div className="absolute -right-8 -top-10 text-[130px] opacity-[0.06] pointer-events-none">
            🍕
          </div>

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl font-bold text-ink">
                Let AI Create Your Pizza
              </h2>
              <span className="badge badge-green text-xs">
                Gemini AI
              </span>
            </div>

            <p className="text-sm text-mute mb-5 max-w-2xl">
              Tell us what flavours you love, your budget, or ingredients
              you want to avoid. Our AI will create a pizza recommendation
              using available ingredients.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="input flex-1 min-w-0 bg-white"
                placeholder="e.g. Spicy, extra cheesy, no onions, under ₹350..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aiSuggest()}
                disabled={aiLoading}
              />

              <button
                className="btn whitespace-nowrap flex items-center justify-center gap-2"
                disabled={aiLoading || !aiPrompt.trim()}
                onClick={aiSuggest}
              >
                {aiLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>✨ Generate Pizza</>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs text-mute py-1">Try:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  disabled={aiLoading}
                  onClick={() => setAiPrompt(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-line text-mute hover:border-basil hover:text-basil transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Main Builder Layout */}
        <div className="grid gap-7 lg:grid-cols-[1fr_340px] items-start">

          {/* Left: Customization */}
          <main className="min-w-0">

            {/* Progress Section */}
            <div className="card p-4 sm:p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-ink">Pizza Creation</p>
                  <p className="text-xs text-mute mt-1">
                    Step {step + 1} of {STEPS.length}
                  </p>
                </div>

                <span className="text-sm font-semibold text-basil">
                  {Math.round(((step + 1) / STEPS.length) * 100)}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-paper overflow-hidden mb-5">
                <div
                  className="h-full bg-basil rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {STEPS.map((s, i) => {
                  const completed =
                    i === 0 ? Boolean(pick.base) :
                    i === 1 ? Boolean(pick.sauce) :
                    i === 2 ? Boolean(pick.cheese) :
                    true;

                  return (
                    <button
                      key={s.key}
                      disabled={i > step}
                      onClick={() => i < step && setStep(i)}
                      className={`text-center rounded-xl p-2 transition-all border ${
                        i === step
                          ? 'border-basil bg-basil/5'
                          : i < step
                            ? 'border-line bg-paper'
                            : 'border-transparent bg-transparent opacity-50'
                      }`}
                    >
                      <div className="text-xl sm:text-2xl mb-1">
                        {i < step && completed ? '✓' : s.icon}
                      </div>
                      <p className={`text-[10px] sm:text-xs font-semibold ${
                        i === step ? 'text-basil' : 'text-mute'
                      }`}>
                        {s.key === 'veggie' ? 'Veggies' : s.key}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ingredient Selection */}
            <div className="card p-5 sm:p-7">

              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <span className="text-xs uppercase tracking-widest font-semibold text-basil">
                    Step {step + 1}
                  </span>

                  <h2 className="text-2xl font-bold text-ink mt-2">
                    {icon} {title}
                  </h2>

                  <p className="text-sm text-mute mt-1">
                    {current.subtitle}
                  </p>
                </div>

                {current.key === 'veggie' && (
                  <span className="text-xs font-semibold bg-basil/10 text-basil px-3 py-2 rounded-lg whitespace-nowrap">
                    {veggies.length} selected
                  </span>
                )}
              </div>

              {current.key === 'veggie' && (
                <p className="text-sm text-mute mb-5 bg-paper rounded-lg p-3">
                  💡 Select as many vegetables as you like. You can also skip
                  this step.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {options[key].map((o) => {
                  const selected =
                    current.key === 'veggie'
                      ? veggies.includes(o.name)
                      : pick[key] === o.name;

                  return (
                    <label
                      key={o.name}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-basil bg-basil/5 shadow-sm'
                          : 'border-line bg-white hover:border-basil/40'
                      } ${
                        !o.inStock
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type={current.key === 'veggie' ? 'checkbox' : 'radio'}
                        name={key}
                        className="accent-basil w-4 h-4 shrink-0"
                        disabled={!o.inStock}
                        checked={selected}
                        onChange={() => toggle(o.name)}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink">
                          {o.name}
                        </p>

                        <p className={`text-xs mt-1 ${
                          o.inStock ? 'text-green-700' : 'text-red-500'
                        }`}>
                          {o.inStock ? '● Available' : '● Sold out'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${
                          selected ? 'text-basil' : 'text-ink'
                        }`}>
                          +₹{o.price}
                        </p>
                        {selected && (
                          <span className="text-[10px] font-semibold text-basil">
                            SELECTED
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-5 mt-7">
                <button
                  className="btn-quiet"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  ← Back
                </button>

                {last ? (
                  <button
                    className="btn flex-1 sm:flex-none"
                    disabled={!pick.base || !pick.sauce || !pick.cheese}
                    onClick={finish}
                  >
                    Add to Cart 🛒
                  </button>
                ) : (
                  <button
                    className="btn flex-1 sm:flex-none"
                    disabled={!canNext}
                    onClick={() => setStep(step + 1)}
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          </main>

          {/* Right: Pizza Summary */}
          <aside className="card p-5 sm:p-6 lg:sticky lg:top-24">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-ink">
                  Your Pizza
                </h2>
                <p className="text-xs text-mute mt-1">
                  Live customization summary
                </p>
              </div>

              <span className="text-2xl">🍕</span>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-paper mb-5">
              <PizzaImage
                src={null}
                alt="Custom pizza"
                className="w-full"
                aspectRatio="aspect-square"
              />

              <div className="absolute bottom-3 left-3">
                <span className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">
                  Custom Pizza
                </span>
              </div>
            </div>

            {/* Selection Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-mute">Ingredients selected</span>
              <span className="text-xs font-bold text-basil">
                {selectedCount}
              </span>
            </div>

            <div className="h-1.5 bg-paper rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-basil rounded-full transition-all"
                style={{
                  width: `${Math.min((selectedCount / 8) * 100, 100)}%`,
                }}
              />
            </div>

            {/* Selected Ingredients */}
            <div className="space-y-4 text-sm">

              {[
                { label: 'Pizza Base', value: pick.base, price: priceOf('base', pick.base) },
                { label: 'Sauce', value: pick.sauce, price: priceOf('sauce', pick.sauce) },
                { label: 'Cheese', value: pick.cheese, price: priceOf('cheese', pick.cheese) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-mute mb-1">{item.label}</p>
                    <p className="font-semibold text-ink break-words">
                      {item.value || 'Not selected'}
                    </p>
                  </div>

                  <span className="font-medium text-ink whitespace-nowrap">
                    {item.value ? `₹${item.price}` : '—'}
                  </span>
                </div>
              ))}

              <div className="border-t border-line pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-mute">Vegetables</p>
                  <span className="text-xs text-mute">
                    {veggies.length} selected
                  </span>
                </div>

                {veggies.length ? (
                  <div className="space-y-2">
                    {veggies.map((v) => (
                      <div
                        key={v}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-ink">{v}</span>
                        <span className="text-ink">
                          ₹{priceOf('veggie', v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-mute italic">
                    No vegetables selected
                  </p>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-line mt-6 pt-5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ink">Total Price</span>
                <span className="text-2xl font-extrabold text-basil">
                  ₹{price}
                </span>
              </div>

              <p className="text-xs text-mute">
                Price based on selected ingredients
              </p>
            </div>

            <div className="mt-5 bg-basil/5 rounded-xl p-3 flex gap-2">
              <span>💚</span>
              <p className="text-xs text-mute leading-relaxed">
                Made your way! Your pizza will be prepared with the
                ingredients you selected.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
