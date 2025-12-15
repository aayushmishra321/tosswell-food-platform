import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Inventory, Order, Coupon, Review, STATUSES, StockMovement, ActivityLog } from '../models.js';
import { auth, signAccess, signRefresh, sha256, httpError } from '../middleware.js';
import { sendMail, orderStatusEmail } from '../mailer.js';

const r = Router();

// Helper: log admin action without blocking response
const log = (req, action, target, details = {}) =>
  ActivityLog.create({ admin: req.user?.id, action, target: String(target), details, ip: req.ip }).catch(() => {});

// ── Admin login (separate from user login) ────────────────────────────────────
r.post('/login', async (req, res) => {
  const body = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) }).parse(req.body);
  const admin = await User.findOne({ email: body.email, role: 'admin' });
  if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash)))
    throw httpError(401, 'Incorrect email or password');

  const refresh = signRefresh(admin);
  admin.refreshTokenHash = sha256(refresh);
  await admin.save();

  res.cookie('refreshToken', refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({
    token: signAccess(admin),
    user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
});

r.use(auth('admin'));

// ── Inventory ─────────────────────────────────────────────────────────────────
r.get('/inventory', async (_req, res) =>
  res.json(await Inventory.find().sort({ category: 1, name: 1 }).lean()),
);

r.patch('/inventory/:id', async (req, res) => {
  const body = z
    .object({
      stock:     z.number().int().min(0).optional(),
      threshold: z.number().int().min(0).optional(),
      price:     z.number().min(0).optional(),
    })
    .parse(req.body);

  const before = await Inventory.findById(req.params.id).lean();
  if (!before) throw httpError(404, 'Item not found');

  const item = await Inventory.findByIdAndUpdate(req.params.id, body, { new: true });

  // Record stock movement if stock changed
  if (body.stock !== undefined && body.stock !== before.stock) {
    await StockMovement.create({
      inventory: item._id,
      category:  item.category,
      name:      item.name,
      before:    before.stock,
      after:     body.stock,
      delta:     body.stock - before.stock,
      reason:    'manual',
      admin:     req.user.id,
    });
    log(req, 'INVENTORY_UPDATE', item._id, { name: item.name, before: before.stock, after: body.stock });
  }

  res.json(item);
});

// ── Orders (paginated, filterable) ────────────────────────────────────────────
r.get('/orders', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const { status, search, from, to } = req.query;

  const filter = { status: { $ne: 'Awaiting Payment' } };
  if (status && STATUSES.includes(status)) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  // Search by ObjectId suffix or razorpayOrderId
  if (search && search.length >= 3) {
    filter.$or = [
      { razorpayOrderId: { $regex: search, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Client-side filter by customer name/email after populate (search is lightweight for admin)
  const filtered = search
    ? orders.filter((o) =>
        o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        String(o._id).endsWith(search.toLowerCase()),
      )
    : orders;

  res.json({ orders: filtered, total, page, pages: Math.ceil(total / limit) });
});

r.patch('/orders/:id/status', async (req, res) => {
  const { status } = z
    .object({ status: z.enum(STATUSES.filter((s) => s !== 'Awaiting Payment')) })
    .parse(req.body);
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: 'Awaiting Payment' } },
    { status },
    { new: true },
  ).populate('user', 'name email');
  if (!order) throw httpError(404, 'Order not found');

  // Emit socket event for real-time tracking
  const io = req.app.get('io');
  if (io) io.to(`order:${order._id}`).emit('statusUpdate', { orderId: order._id, status });

  // Email customer for key status changes
  const notifyStatuses = ['Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  if (notifyStatuses.includes(status) && order.user?.email) {
    const mail = orderStatusEmail(order, order.user.name, status);
    await sendMail({ to: order.user.email, ...mail });
  }

  res.json(order);
});

// ── Analytics ────────────────────────────────────────────────────────────────
r.get('/analytics', async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const paidStatuses = STATUSES.filter((s) => s !== 'Awaiting Payment' && s !== 'Cancelled');

  const [
    totalOrders,
    totalRevenue,
    recentOrders,
    dailySales,
    hourlySales,
    topPizzas,
    statusDist,
    customerCount,
    lowStock,
  ] = await Promise.all([
    // Total confirmed orders
    Order.countDocuments({ status: { $in: paidStatuses } }),

    // Total revenue
    Order.aggregate([
      { $match: { status: { $in: paidStatuses } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),

    // Last 7 days orders count
    Order.countDocuments({ status: { $in: paidStatuses }, createdAt: { $gte: sevenDaysAgo } }),

    // Daily sales last 30 days
    Order.aggregate([
      { $match: { status: { $in: paidStatuses }, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Orders by hour of day
    Order.aggregate([
      { $match: { status: { $in: paidStatuses }, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Top pizzas by quantity sold
    Order.aggregate([
      { $match: { status: { $in: paidStatuses } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),

    // Order status distribution
    Order.aggregate([
      { $match: { status: { $ne: 'Awaiting Payment' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Total customers
    User.countDocuments({ role: 'user', verified: true }),

    // Low stock items
    Inventory.find({ $expr: { $lt: ['$stock', '$threshold'] } }).lean(),
  ]);

  const totalRev = totalRevenue[0]?.total || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;

  res.json({
    summary: { totalOrders, totalRevenue: totalRev, avgOrderValue, recentOrders, customerCount },
    dailySales,
    hourlySales,
    topPizzas,
    statusDist,
    lowStock,
  });
});

// ── Coupons ──────────────────────────────────────────────────────────────────
r.get('/coupons', async (_req, res) => res.json(await Coupon.find().sort({ createdAt: -1 }).lean()));

r.post('/coupons', async (req, res) => {
  const body = z
    .object({
      code: z.string().trim().min(2).max(20).toUpperCase(),
      type: z.enum(['percent', 'fixed']),
      value: z.number().positive(),
      minOrder: z.number().min(0).optional(),
      maxDiscount: z.number().positive().optional(),
      expiresAt: z.string().datetime().optional(),
      usageLimit: z.number().int().positive().optional(),
      perUserLimit: z.number().int().positive().optional(),
    })
    .parse(req.body);
  const coupon = await Coupon.create(body);
  res.status(201).json(coupon);
});

r.patch('/coupons/:id', async (req, res) => {
  const body = z.object({ active: z.boolean() }).parse(req.body);
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!coupon) throw httpError(404, 'Coupon not found');
  res.json(coupon);
});

r.delete('/coupons/:id', async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw httpError(404, 'Coupon not found');
  res.json({ message: 'Coupon deleted' });
});

// ── Reviews moderation ───────────────────────────────────────────────────────
r.get('/reviews', async (_req, res) => {
  const reviews = await Review.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(reviews);
});

r.patch('/reviews/:id', async (req, res) => {
  const { visible } = z.object({ visible: z.boolean() }).parse(req.body);
  const review = await Review.findByIdAndUpdate(req.params.id, { visible }, { new: true });
  if (!review) throw httpError(404, 'Review not found');
  res.json(review);
});

// ── Activity logs ─────────────────────────────────────────────────────────────
r.get('/activity-logs', async (req, res) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const logs  = await ActivityLog.find()
    .populate('admin', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await ActivityLog.countDocuments();
  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
});

// ── Customer management ───────────────────────────────────────────────────
r.get('/customers', async (req, res) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip  = (page - 1) * limit;
  const { search } = req.query;

  const filter = { role: 'user' };
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select('name email verified createdAt loyaltyPoints loyaltyTier')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Enrich with order stats
  const ids = customers.map((c) => c._id);
  const stats = await Order.aggregate([
    { $match: { user: { $in: ids }, status: { $nin: ['Awaiting Payment', 'Cancelled'] } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' }, lastOrder: { $max: '$createdAt' } } },
  ]);
  const statsMap = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  const enriched = customers.map((c) => ({
    ...c,
    orders:    statsMap[String(c._id)]?.orders    || 0,
    spent:     statsMap[String(c._id)]?.spent     || 0,
    lastOrder: statsMap[String(c._id)]?.lastOrder || null,
  }));

  res.json({ customers: enriched, total, page, pages: Math.ceil(total / limit) });
});

r.get('/customers/:id/orders', async (req, res) => {
  const orders = await Order.find({ user: req.params.id, status: { $ne: 'Awaiting Payment' } })
    .sort({ createdAt: -1 }).limit(20).lean();
  res.json(orders);
});

export default r;
