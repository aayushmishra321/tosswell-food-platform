import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const load = () => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } };

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);
  useEffect(() => localStorage.setItem('cart', JSON.stringify(lines)), [lines]);

  const key = (l) =>
    l.type === 'preset'
      ? `p:${l.pizzaId}`
      : `c:${l.base}|${l.sauce}|${l.cheese}|${[...(l.veggies||[])].sort()}`;

  const add = (line) =>
    setLines((ls) => {
      const k = key(line);
      return ls.some((x) => x.key === k)
        ? ls.map((x) => x.key === k ? { ...x, qty: Math.min(x.qty + 1, 10) } : x)
        : [...ls, { ...line, key: k, qty: 1 }];
    });

  const setQty = (k, qty) =>
    setLines((ls) => qty < 1 ? ls.filter((x) => x.key !== k) : ls.map((x) => x.key === k ? { ...x, qty: Math.min(qty, 10) } : x));

  const remove  = (k)  => setLines((ls) => ls.filter((x) => x.key !== k));
  const clear   = ()   => setLines([]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  return <Ctx value={{ lines, add, setQty, remove, clear, count, total }}>{children}</Ctx>;
}
