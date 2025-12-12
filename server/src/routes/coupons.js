import { Router } from 'express';
import { z } from 'zod';
import { Coupon } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();

// GET /api/coupons — list active coupons for customers to browse
r.get('/', auth(), async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    // handle both active and isActive field names from old seeded docs
    $or: [{ active: true }, { isActive: true }],
    // not expired — also include docs where expiresAt field doesn't exist
    $and: [
      { $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }, { expiresAt: null }] },
    ],
  })
    .select('code type value minOrder maxDiscount expiresAt active isActive')
    .sort({ createdAt: -1 })
    .lean();
  res.json(coupons);
});

// POST /api/coupons/validate — validate & preview discount (any logged-in role)
r.post('/validate', auth(), async (req, res) => {
  const { code, subtotal } = z.object({
    code: z.string().trim().min(1),
    subtotal: z.number().positive(),
  }).parse(req.body);

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw httpError(404, 'Coupon not found or inactive');

  // Normalise — old seeded docs may use isActive instead of active
  const isActive = coupon.active ?? coupon.isActive ?? true;
  if (!isActive) throw httpError(404, 'Coupon not found or inactive');

  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw httpError(400, 'This coupon has expired');

  // Normalise usage limit field names
  const usageLimit = coupon.usageLimit ?? coupon.totalUses;
  if (usageLimit && coupon.usedCount >= usageLimit) throw httpError(400, 'Coupon usage limit reached');

  if (subtotal < (coupon.minOrder || 0)) throw httpError(400, `Minimum order amount is ₹${coupon.minOrder}`);

  // Per-user limit — normalise field name
  const perUserLimit = coupon.perUserLimit ?? coupon.usesPerUser ?? 1;
  const userUses = coupon.usedBy.filter((id) => String(id) === String(req.user.id)).length;
  if (userUses >= perUserLimit) throw httpError(400, 'You have already used this coupon');

  // Normalise type — old docs may store 'percentage' instead of 'percent'
  const type = coupon.type === 'percentage' ? 'percent' : coupon.type;

  let discount =
    type === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  res.json({ valid: true, code: coupon.code, discount, type, value: coupon.value });
});

export default r;
