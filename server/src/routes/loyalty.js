import { Router } from 'express';
import { User, LoyaltyTx } from '../models.js';
import { auth } from '../middleware.js';

const r = Router();
r.use(auth('user'));

// Points per rupee earned, and INR value per point redeemed
const EARN_RATE  = 1;   // 1 point per ₹10 spent
const REDEEM_RATE = 0.5; // 1 point = ₹0.50 discount
const TIER_THRESHOLDS = { Silver: 500, Gold: 1500 };

export function calcPointsEarned(total) {
  return Math.floor(total / 10) * EARN_RATE;
}

export function calcPointsValue(points) {
  return Math.round(points * REDEEM_RATE);
}

export function tierFor(points) {
  if (points >= TIER_THRESHOLDS.Gold)   return 'Gold';
  if (points >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}

// GET /api/loyalty
r.get('/', async (req, res) => {
  const user = await User.findById(req.user.id).select('loyaltyPoints loyaltyTier name').lean();
  const history = await LoyaltyTx.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({
    points: user.loyaltyPoints,
    tier: user.loyaltyTier,
    redeemValue: calcPointsValue(user.loyaltyPoints),
    history,
    tiers: TIER_THRESHOLDS,
  });
});

export default r;
