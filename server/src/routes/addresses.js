import { Router } from 'express';
import { z } from 'zod';
import { Address } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();
r.use(auth('user'));

const addressSchema = z.object({
  label: z.string().trim().max(30).optional(),
  line1: z.string().trim().min(3, 'Enter your street address'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter your city'),
  state: z.string().trim().min(2, 'Enter your state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  isDefault: z.boolean().optional(),
});

// GET /api/addresses — list all addresses for current user
r.get('/', async (req, res) => {
  const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 }).lean();
  res.json(addresses);
});

// POST /api/addresses — add new address
r.post('/', async (req, res) => {
  const body = addressSchema.parse(req.body);
  // If marking as default, unset others
  if (body.isDefault) await Address.updateMany({ user: req.user.id }, { isDefault: false });
  // Auto-default if first address
  const count = await Address.countDocuments({ user: req.user.id });
  const address = await Address.create({ ...body, user: req.user.id, isDefault: body.isDefault ?? count === 0 });
  res.status(201).json(address);
});

// PATCH /api/addresses/:id — update address
r.patch('/:id', async (req, res) => {
  const body = addressSchema.partial().parse(req.body);
  if (body.isDefault) await Address.updateMany({ user: req.user.id }, { isDefault: false });
  const address = await Address.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, body, { new: true });
  if (!address) throw httpError(404, 'Address not found');
  res.json(address);
});

// DELETE /api/addresses/:id — remove address
r.delete('/:id', async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!address) throw httpError(404, 'Address not found');
  // If we deleted the default, make the next one default
  if (address.isDefault) {
    const next = await Address.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    if (next) { next.isDefault = true; await next.save(); }
  }
  res.json({ message: 'Address removed' });
});

// POST /api/addresses/:id/default — set as default
r.post('/:id/default', async (req, res) => {
  await Address.updateMany({ user: req.user.id }, { isDefault: false });
  const address = await Address.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { isDefault: true }, { new: true });
  if (!address) throw httpError(404, 'Address not found');
  res.json(address);
});

export default r;
