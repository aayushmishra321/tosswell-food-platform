import { useState, useRef, useEffect } from 'react';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import PizzaImage from '../PizzaImage';
import toast from 'react-hot-toast';

function PizzaCard({ pizza, onAdd }) {
  return (
    <div className="mt-2 rounded-xl border border-line bg-white overflow-hidden text-sm shadow-sm">
      <PizzaImage src={pizza.image?.thumb || pizza.image?.url} alt={pizza.name} className="w-full" aspectRatio="aspect-[16/9]" />
      <div className="p-3">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <span className="font-bold">{pizza.name}</span>
          <span className="text-basil font-bold shrink-0">₹{pizza.price}</span>
        </div>
        {pizza.description && <p className="text-xs text-mute mb-2 line-clamp-2">{pizza.description}</p>}
        <button className="btn w-full py-1.5 text-xs" onClick={() => onAdd(pizza)}>Add to Cart</button>
      </div>
    </div>
  );
}

function parsePizzas(text) {
  const m = text.match(/```json\n?([\s\S]*?)\n?```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function Message({ msg, onAddPizza }) {
  const text = msg.text ?? msg.parts?.[0]?.text ?? '';
  const cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();
  const pizzas = msg.role === 'model' ? parsePizzas(text) : null;
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
        msg.role === 'user' ? 'bg-basil text-white rounded-br-sm' : 'bg-white border border-line rounded-bl-sm'
      }`}>
        <p className="whitespace-pre-wrap">{cleanText}</p>
        {pizzas?.map?.((p) => <PizzaCard key={p.id || p.name} pizza={p} onAdd={onAddPizza} />)}
      </div>
    </div>
  );
}

export default function AiChat() {
  const { user }   = useAuth();
  const { add }    = useCart();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [history,  setHistory]  = useState([
    { role: 'model', parts: [{ text: "Hi! I'm Tossy 🍕 Tell me what you're craving and I'll find your perfect pizza!" }] },
  ]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, busy]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  // Listen for external open trigger (e.g. "Chat with Tossy" button on homepage)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('tossy:open', handler);
    return () => window.removeEventListener('tossy:open', handler);
  }, []);

  if (!user || user.role !== 'user') return null;

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim(); setInput('');
    const userEntry = { role: 'user', parts: [{ text: msg }] };
    const apiHistory = history.filter((_, i) => i > 0);
    setHistory((h) => [...h, userEntry]);
    setBusy(true);
    try {
      const { data } = await api.post('/ai/chat', { history: apiHistory, message: msg });
      setHistory((h) => [...h, { role: 'model', parts: [{ text: data.reply }] }]);
    } catch (e) {
      setHistory((h) => [...h, { role: 'model', parts: [{ text: `Sorry, I ran into an issue: ${errMsg(e)}` }] }]);
    } finally { setBusy(false); }
  };

  const addPizza = (pizza) => {
    add({ type: 'preset', pizzaId: pizza.id, name: pizza.name, price: pizza.price, imageUrl: pizza.image?.thumb || null });
    toast.success(`${pizza.name} added to cart!`);
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-label="Open pizza assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-basil text-2xl text-white shadow-xl hover:bg-basil2 transition-all hover:scale-110">
        {open ? '✕' : '🍕'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl border border-line bg-paper shadow-2xl max-h-[32rem]">
          <div className="flex items-center gap-3 rounded-t-2xl bg-basil px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl">🍕</div>
            <div>
              <p className="font-bold text-white text-sm">Tossy</p>
              <p className="text-white/60 text-xs">AI Pizza Assistant · Gemini</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/60 hover:text-white text-lg">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.map((msg, i) => <Message key={i} msg={msg} onAddPizza={addPizza} />)}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-line rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
                  {[0,1,2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-mute animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-3 flex gap-2">
            <input ref={inputRef} className="input flex-1 text-sm" placeholder="Ask for a recommendation…"
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()} disabled={busy} />
            <button className="btn px-3 py-2" onClick={send} disabled={busy || !input.trim()}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
