import { Router } from 'express';
import { z } from 'zod';
import { Review, Order } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();

// GET /api/reviews/recent — public, for homepage
r.get('/recent', async (_req, res) => {
  const reviews = await Review.find({ visible: true, comment: { $exists: true, $ne: '' } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  res.json(reviews);
});

// GET /api/reviews/pizza/:pizzaId — public
r.get('/pizza/:pizzaId', async (req, res) => {
  const reviews = await Review.find({ pizza: req.params.pizzaId, visible: true })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json(reviews);
});

// POST /api/reviews
r.post('/', auth('user'), async (req, res) => {
  const body = z.object({
    orderId:  z.string(),
    pizzaId:  z.string().optional(),
    rating:   z.number().int().min(1).max(5),
    comment:  z.string().trim().max(1000).optional(),
  }).parse(req.body);

  const order = await Order.findOne({ _id: body.orderId, user: req.user.id, status: 'Delivered' });
  if (!order) throw httpError(400, 'You can only review delivered orders');

  const existing = await Review.findOne({ user: req.user.id, order: body.orderId });
  if (existing) throw httpError(409, 'You have already reviewed this order');

  const review = await Review.create({
    user:    req.user.id,
    order:   body.orderId,
    pizza:   body.pizzaId || null,
    rating:  body.rating,
    comment: body.comment,
  });
  const populated = await review.populate('user', 'name');
  res.status(201).json(populated);
});

// DELETE /api/reviews/:id
r.delete('/:id', auth('user'), async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!review) throw httpError(404, 'Review not found');
  res.json({ message: 'Review deleted' });
});

export default r;
