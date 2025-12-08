import { Router } from 'express';
import { Pizza, Inventory, Review } from '../models.js';

const r = Router();

r.get('/', async (_req, res) => {
  const [pizzas, inv, ratings] = await Promise.all([
    Pizza.find({ available: true }).sort({ price: 1 }).lean(),
    Inventory.find().sort({ name: 1 }).lean(),
    Review.aggregate([
      { $match: { visible: true, pizza: { $exists: true, $ne: null } } },
      { $group: { _id: '$pizza', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const ratingsMap = Object.fromEntries(
    ratings.map((r) => [String(r._id), { avg: Math.round(r.avg * 10) / 10, count: r.count }]),
  );

  const options = { base: [], sauce: [], cheese: [], veggie: [] };
  for (const i of inv)
    options[i.category].push({ name: i.name, price: i.price, inStock: i.stock > 0 });

  const enriched = pizzas.map((p) => ({
    ...p,
    rating:     ratingsMap[String(p._id)]?.avg   || 0,
    reviewCount: ratingsMap[String(p._id)]?.count || 0,
  }));

  res.json({ pizzas: enriched, options });
});

export default r;
