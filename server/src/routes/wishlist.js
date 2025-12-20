import { Router } from 'express';
import { z } from 'zod';
import { Wishlist, Pizza } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();
r.use(auth('user'));

// GET /api/wishlist
r.get('/', async (req, res) => {
  const wl = await Wishlist.findOne({ user: req.user.id })
    .populate('pizzas', 'name price description image available')
    .lean();
  res.json(wl?.pizzas || []);
});

// POST /api/wishlist/:pizzaId — toggle
r.post('/:pizzaId', async (req, res) => {
  const { pizzaId } = z.object({ pizzaId: z.string().min(1) }).parse(req.params);

  const pizza = await Pizza.findById(pizzaId).lean();
  if (!pizza) throw httpError(404, 'Pizza not found');

  let wl = await Wishlist.findOne({ user: req.user.id });
  if (!wl) wl = await Wishlist.create({ user: req.user.id, pizzas: [] });

  const idx = wl.pizzas.findIndex((p) => String(p) === pizzaId);
  if (idx === -1) {
    wl.pizzas.push(pizzaId);
    await wl.save();
    res.json({ added: true, pizzaId });
  } else {
    wl.pizzas.splice(idx, 1);
    await wl.save();
    res.json({ added: false, pizzaId });
  }
});

// DELETE /api/wishlist/:pizzaId
r.delete('/:pizzaId', async (req, res) => {
  await Wishlist.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { pizzas: req.params.pizzaId } },
  );
  res.json({ message: 'Removed from wishlist' });
});

export default r;
