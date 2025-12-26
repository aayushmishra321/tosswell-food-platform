import { Router } from 'express';
import crypto from 'node:crypto';
import { User, Referral, LoyaltyTx } from '../models.js';
import { auth, httpError } from '../middleware.js';
import { tierFor } from './loyalty.js';

const r = Router();
r.use(auth('user'));

const REFERRER_BONUS  = 100; // points awarded to referrer
const REFERRED_BONUS  = 50;  // points awarded to new user

// GET /api/referral — get my referral code + stats
r.get('/', async (req, res) => {
  let user = await User.findById(req.user.id).lean();
  if (!user) throw httpError(404, 'User not found');

  // Auto-generate a referral code if none exists
  if (!user.referralCode) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    user = await User.findByIdAndUpdate(
      req.user.id,
      { referralCode: code },
      { new: true },
    ).lean();
  }

  const referrals = await Referral.find({ referrer: req.user.id })
    .populate('referred', 'name createdAt')
    .lean();

  res.json({
    code: user.referralCode,
    referrals: referrals.map((ref) => ({
      name:      ref.referred?.name || 'Unknown',
      joinedAt:  ref.referred?.createdAt,
      rewarded:  ref.rewarded,
    })),
    totalEarned: referrals.filter((r) => r.rewarded).length * REFERRER_BONUS,
  });
});

// POST /api/referral/redeem — called after a referred user's first order is paid
// Called internally from orders.js — not exposed to client directly
export async function rewardReferral(userId) {
  const referral = await Referral.findOne({ referred: userId, rewarded: false });
  if (!referral) return;

  referral.rewarded   = true;
  referral.rewardedAt = new Date();
  await referral.save();

  // Award referrer
  const referrer = await User.findByIdAndUpdate(
    referral.referrer,
    { $inc: { loyaltyPoints: REFERRER_BONUS } },
    { new: true },
  );
  if (referrer) {
    const newTier = tierFor(referrer.loyaltyPoints);
    if (newTier !== referrer.loyaltyTier) await User.findByIdAndUpdate(referral.referrer, { loyaltyTier: newTier });
    await LoyaltyTx.create({
      user:        referral.referrer,
      type:        'bonus',
      points:      REFERRER_BONUS,
      description: `Referral bonus — your friend joined Tosswell!`,
    });
  }

  // Award referred user
  const referred = await User.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: REFERRED_BONUS } },
    { new: true },
  );
  if (referred) {
    await LoyaltyTx.create({
      user:        userId,
      type:        'bonus',
      points:      REFERRED_BONUS,
      description: 'Welcome bonus — joined via referral!',
    });
  }
}

export default r;
