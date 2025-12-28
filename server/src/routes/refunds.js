import { Router } from 'express';
import { z } from 'zod';
import { Refund, Order } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();

// POST /api/refunds — customer submits refund request
r.post('/', auth('user'), async (req, res) => {
  const { orderId, reason } = z.object({
    orderId: z.string().min(1),
    reason:  z.string().trim().min(10).max(500),
  }).parse(req.body);

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) throw httpError(404, 'Order not found');

  const refundable = ['Cancelled', 'Delivered'];
  if (!refundable.includes(order.status))
    throw httpError(400, 'Refund requests can only be submitted for delivered or cancelled orders');

  const existing = await Refund.findOne({ order: orderId });
  if (existing) throw httpError(409, 'A refund request already exists for this order');

  const refund = await Refund.create({
    order:  orderId,
    user:   req.user.id,
    amount: order.total,
    reason,
  });

  res.status(201).json(refund);
});

// GET /api/refunds/mine — customer's refund requests
r.get('/mine', auth('user'), async (req, res) => {
  const refunds = await Refund.find({ user: req.user.id })
    .populate('order', 'total status createdAt')
    .sort({ createdAt: -1 })
    .lean();
  res.json(refunds);
});

// Admin endpoints
// GET /api/refunds — all refunds (admin)
r.get('/', auth('admin'), async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const refunds = await Refund.find(filter)
    .populate('order', 'total status createdAt razorpayOrderId')
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(refunds);
});

// PATCH /api/refunds/:id — admin approves/rejects
r.patch('/:id', auth('admin'), async (req, res) => {
  const { status, adminNote } = z.object({
    status:    z.enum(['approved', 'rejected', 'processed']),
    adminNote: z.string().trim().max(500).optional(),
  }).parse(req.body);

  const refund = await Refund.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(adminNote && { adminNote }),
      ...(status === 'processed' && { processedAt: new Date() }),
    },
    { new: true },
  ).populate('user', 'name email');

  if (!refund) throw httpError(404, 'Refund not found');

  // Log admin action
  const { ActivityLog } = await import('../models.js');
  await ActivityLog.create({
    admin:   req.user.id,
    action:  'REFUND_STATUS_UPDATE',
    target:  String(refund._id),
    details: { status, adminNote },
    ip:      req.ip,
  });

  res.json(refund);
});

export default r;
