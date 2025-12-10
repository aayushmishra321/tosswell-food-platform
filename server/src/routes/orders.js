import { Router } from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { Order, Pizza, Inventory, Coupon, Address, User, LoyaltyTx } from '../models.js';
import { auth, httpError } from '../middleware.js';
import { sendMail, orderConfirmationEmail } from '../mailer.js';
import { calcPointsEarned, calcPointsValue, tierFor } from './loyalty.js';

const r = Router();
r.use(auth('user'));

const qty = z.number().int().min(1).max(10);
const lineSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('preset'), pizzaId: z.string(), qty }),
  z.object({
    type: z.literal('custom'),
    base: z.string(),
    sauce: z.string(),
    cheese: z.string(),
    veggies: z.array(z.string()).max(10),
    qty,
  }),
]);

const partsOf = (p) => [
  ['base', p.base],
  ['sauce', p.sauce],
  ['cheese', p.cheese],
  ...p.veggies.map((v) => ['veggie', v]),
];

async function buildItems(lines) {
  const inv = await Inventory.find().lean();
  const find = (c, n) => inv.find((i) => i.category === c && i.name === n);
  const need = new Map();
  const use = (item, n) =>
    need.set(String(item._id), { item, n: (need.get(String(item._id))?.n || 0) + n });
  const items = [];

  for (const l of lines) {
    let pizza;
    if (l.type === 'preset') {
      const p = await Pizza.findById(l.pizzaId).lean();
      if (!p) throw httpError(400, 'That pizza is no longer on the menu');
      pizza = { name: p.name, price: p.price, base: p.base, sauce: p.sauce, cheese: p.cheese, veggies: p.veggies, pizzaId: p._id, imageUrl: p.image?.thumb || null };
    } else {
      pizza = { name: 'Custom pizza', price: 0, base: l.base, sauce: l.sauce, cheese: l.cheese, veggies: [...new Set(l.veggies)], imageUrl: null };
    }
    for (const [c, n] of partsOf(pizza)) {
      const it = find(c, n);
      if (!it) throw httpError(400, `Unknown ingredient: ${n}`);
      if (l.type === 'custom') pizza.price += it.price;
      use(it, l.qty);
    }
    items.push({ ...pizza, qty: l.qty });
  }
  for (const { item, n } of need.values())
    if (item.stock < n) throw httpError(409, `Sorry, ${item.name} just ran out`);
  return items;
}

async function decrementStock(order) {
  const counts = new Map();
  for (const it of order.items)
    for (const [c, n] of partsOf(it))
      counts.set(`${c}|${n}`, (counts.get(`${c}|${n}`) || 0) + it.qty);
  await Inventory.bulkWrite(
    [...counts].map(([k, n]) => {
      const [category, name] = k.split('|');
      return {
        updateOne: {
          filter: { category, name },
          update: [{ $set: { stock: { $max: [0, { $subtract: ['$stock', n] }] } } }],
        },
      };
    }),
  );
}

// ── POST /api/orders — create order ──────────────────────────────────────────
r.post('/', async (req, res) => {
  const { lines, couponCode, addressId, pointsUsed: rawPointsUsed } = z
    .object({
      lines: z.array(lineSchema).min(1).max(20),
      couponCode: z.string().trim().optional(),
      addressId: z.string().optional(),
      pointsUsed: z.number().int().min(0).optional(),
    })
    .parse(req.body);

  const items = await buildItems(lines);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  // ── Coupon validation ──────────────────────────────────────────────────────
  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.active) throw httpError(400, 'Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw httpError(400, 'Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw httpError(400, 'Coupon usage limit reached');
    if (subtotal < coupon.minOrder) throw httpError(400, `Minimum order ₹${coupon.minOrder} required for this coupon`);
    const userUses = coupon.usedBy.filter((id) => String(id) === String(req.user.id)).length;
    if (userUses >= (coupon.perUserLimit || 1)) throw httpError(400, 'You have already used this coupon');
    discount =
      coupon.type === 'percent'
        ? Math.round((subtotal * coupon.value) / 100)
        : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, subtotal);
    appliedCoupon = coupon;
  }

  // ── Loyalty points redemption ──────────────────────────────────────────────
  let loyaltyDiscount = 0;
  let pointsUsed = 0;
  if (rawPointsUsed && rawPointsUsed > 0) {
    const userDoc = await User.findById(req.user.id).lean();
    if (!userDoc) throw httpError(400, 'User not found');
    const availablePoints = Math.min(rawPointsUsed, userDoc.loyaltyPoints);
    pointsUsed = availablePoints;
    const rawDiscount = calcPointsValue(availablePoints);
    // Cannot discount more than what remains after coupon
    loyaltyDiscount = Math.min(rawDiscount, subtotal - discount);
  }

  const total = Math.max(0, subtotal - discount - loyaltyDiscount);

  // ── Address ────────────────────────────────────────────────────────────────
  let addressSnap = null;
  if (addressId) {
    const addr = await Address.findOne({ _id: addressId, user: req.user.id }).lean();
    if (!addr) throw httpError(400, 'Address not found');
    addressSnap = { label: addr.label, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode };
  }

  // ── Razorpay order ─────────────────────────────────────────────────────────
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const rzpOrder = await rzp.orders.create({ amount: Math.round(total * 100), currency: 'INR', receipt: `rcpt_${Date.now()}` });

  const order = await Order.create({
    user: req.user.id,
    items,
    subtotal,
    discount,
    loyaltyDiscount,
    total,
    coupon: appliedCoupon?.code,
    pointsUsed,
    address: addressSnap,
    razorpayOrderId: rzpOrder.id,
    estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000), // 45 min ETA
  });

  res.status(201).json({
    orderId: order.id,
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    subtotal,
    discount,
    loyaltyDiscount,
    total,
  });
});

// ── POST /api/orders/verify — verify payment ──────────────────────────────────
r.post('/verify', async (req, res) => {
  const b = z
    .object({
      orderId: z.string(),
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    })
    .parse(req.body);

  const order = await Order.findOne({ _id: b.orderId, user: req.user.id });
  if (!order || order.razorpayOrderId !== b.razorpay_order_id) throw httpError(404, 'Order not found');

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const s = Buffer.from(b.razorpay_signature);
  if (a.length !== s.length || !crypto.timingSafeEqual(a, s))
    throw httpError(400, 'Payment verification failed');

  // Idempotent: only confirm once
  const confirmed = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Awaiting Payment' },
    { status: 'Order Placed', paymentId: b.razorpay_payment_id },
    { new: true },
  );

  if (confirmed) {
    await decrementStock(confirmed);
    // Record coupon usage
    if (confirmed.coupon) {
      await Coupon.findOneAndUpdate(
        { code: confirmed.coupon },
        { $inc: { usedCount: 1 }, $push: { usedBy: req.user.id } },
      );
    }
    // Deduct loyalty points used for this order
    if (confirmed.pointsUsed > 0) {
      const afterDeduct = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { loyaltyPoints: -confirmed.pointsUsed } },
        { new: true },
      );
      await LoyaltyTx.create({
        user: req.user.id,
        type: 'redeem',
        points: -confirmed.pointsUsed,
        description: `Redeemed for order #${String(confirmed._id).slice(-6).toUpperCase()}`,
        order: confirmed._id,
      });
      // Re-calculate tier after deduction
      if (afterDeduct) {
        const newTier = tierFor(afterDeduct.loyaltyPoints);
        if (newTier !== afterDeduct.loyaltyTier) {
          await User.findByIdAndUpdate(req.user.id, { loyaltyTier: newTier });
        }
      }
    }
    // Award loyalty points (earn on amount actually paid)
    const earned = calcPointsEarned(confirmed.total);
    if (earned > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { loyaltyPoints: earned } },
        { new: true },
      );
      if (updatedUser) {
        const newTier = tierFor(updatedUser.loyaltyPoints);
        if (newTier !== updatedUser.loyaltyTier) {
          await User.findByIdAndUpdate(req.user.id, { loyaltyTier: newTier });
        }
        await LoyaltyTx.create({
          user: req.user.id,
          type: 'earn',
          points: earned,
          description: `Earned for order #${String(confirmed._id).slice(-6).toUpperCase()}`,
          order: confirmed._id,
        });
        await Order.findByIdAndUpdate(confirmed._id, { pointsEarned: earned });
      }
    }
    // Update pizza soldCount
    for (const item of confirmed.items) {
      if (item.pizzaId) {
        await Pizza.findByIdAndUpdate(item.pizzaId, { $inc: { soldCount: item.qty } });
      }
    }
    // Send confirmation email
    const user = await User.findById(req.user.id).lean();
    if (user) {
      const mail = orderConfirmationEmail(confirmed, user.name);
      await sendMail({ to: user.email, ...mail });
    }
  }

  res.json(confirmed ?? order);
});

// ── GET /api/orders/mine — customer order history ─────────────────────────────
r.get('/mine', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { user: req.user.id, status: { $ne: 'Awaiting Payment' } };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page, pages: Math.ceil(total / limit) });
});

// ── POST /api/orders/:id/reorder — reorder with live prices ──────────────────
r.post('/:id/reorder', async (req, res) => {
  const original = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!original) throw httpError(404, 'Order not found');

  // Build lines with live prices from the database
  const inv = await Inventory.find().lean();
  const findPrice = (c, n) => inv.find((i) => i.category === c && i.name === n)?.price || 0;

  const lines = await Promise.all(
    original.items.map(async (it) => {
      if (it.pizzaId) {
        const pizza = await Pizza.findById(it.pizzaId).lean();
        if (!pizza) return null; // removed from menu — skip
        return {
          type:     'preset',
          pizzaId:  String(it.pizzaId),
          qty:      it.qty,
          name:     pizza.name,
          price:    pizza.price,          // live price
          imageUrl: pizza.image?.thumb || null,
        };
      }
      // Custom pizza — recalculate price from live ingredient prices
      const price =
        findPrice('base',   it.base)   +
        findPrice('sauce',  it.sauce)  +
        findPrice('cheese', it.cheese) +
        (it.veggies || []).reduce((s, v) => s + findPrice('veggie', v), 0);
      return {
        type:    'custom',
        base:    it.base,
        sauce:   it.sauce,
        cheese:  it.cheese,
        veggies: it.veggies || [],
        qty:     it.qty,
        name:    'Custom Pizza',
        price,
        imageUrl: null,
      };
    }),
  );

  res.json({ lines: lines.filter(Boolean) });
});

export default r;
