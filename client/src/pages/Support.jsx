import { useState, useRef, useEffect } from 'react';
import { api, errMsg } from '../api';

export default function Support() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm the Tosswell support bot 🍕 Ask me about our menu, allergens, delivery, refunds, or coupons." }
  ]);
  const [busy,    setBusy]    = useState(false);
  const [status,  setStatus]  = useState(null); // { available, indexed }
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    api.get('/rag/status').then((r) => setStatus(r.data)).catch(() => setStatus({ available: false }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async () => {
    if (!question.trim() || busy) return;
    const q = question.trim();
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const { data } = await api.post('/rag/ask', { question: q });
      setMessages((m) => [...m, {
        role: 'bot',
        text: data.answer,
        sources: data.sources,
        ragUsed: data.ragUsed,
      }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: `Sorry, I ran into an issue: ${errMsg(e)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const SUGGESTIONS = [
    'What allergens are in your pizzas?',
    'How long does delivery take?',
    'What is your refund policy?',
    'How does the loyalty program work?',
    'What payment methods do you accept?',
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl mb-2">Customer Support</h1>
        <p className="text-mute">Ask anything about our menu, delivery, payments, or policies.</p>
        {status && !status.available && (
          <div className="mt-3 rounded-xl border border-crust/30 bg-crust/10 px-4 py-2 text-sm text-amber-700">
            ⚠️ AI support is currently offline. Please email <a href="mailto:tosswellpizza@gmail.com" className="underline">tosswellpizza@gmail.com</a>
          </div>
        )}
        {status?.available && !status?.indexed && (
          <div className="mt-3 rounded-xl border border-crust/30 bg-crust/10 px-4 py-2 text-sm text-amber-700">
            ⚠️ Knowledge base not yet indexed. Ask an admin to run <code>npm run seed:rag</code>.
          </div>
        )}
      </div>

      {/* Chat window */}
      <div className="card overflow-hidden flex flex-col" style={{ height: '480px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-basil text-white rounded-br-sm'
                  : 'bg-paper border border-line rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.sources?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-line/50">
                    <p className="text-xs text-mute">Sources: {m.sources.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-paper border border-line rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                {[0,1,2].map((i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-mute animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="border-t border-line p-3">
            <p className="text-xs text-mute mb-2">Common questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setQuestion(s)}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-xs hover:border-basil hover:text-basil transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-line p-3 flex gap-2">
          <input
            ref={inputRef}
            className="input flex-1 text-sm"
            placeholder="Ask a question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            disabled={busy}
          />
          <button className="btn px-3 py-2" onClick={ask} disabled={busy || !question.trim()}>
            {busy ? '…' : '↑'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-mute">
        Can't find your answer? Email us at{' '}
        <a href="mailto:tosswellpizza@gmail.com" className="text-basil underline">tosswellpizza@gmail.com</a>
      </div>
    </div>
  );
}
