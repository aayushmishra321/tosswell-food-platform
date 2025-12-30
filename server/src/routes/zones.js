import { Router } from 'express';
import { z } from 'zod';
import { DeliveryZone } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();

const zoneSchema = z.object({
  name:     z.string().trim().min(2),
  pincodes: z.array(z.string().regex(/^\d{6}$/, 'Each pincode must be 6 digits')),
  fee:      z.number().min(0),
  minOrder: z.number().min(0).optional(),
  active:   z.boolean().optional(),
  etaMin:   z.number().int().min(10).optional(),
});

// GET /api/zones — public, used by checkout to look up fee by pincode
r.get('/', async (_req, res) => {
  const zones = await DeliveryZone.find({ active: true }).lean();
  res.json(zones);
});

// GET /api/zones/lookup/:pincode — returns fee for a pincode
r.get('/lookup/:pincode', async (req, res) => {
  const { pincode } = req.params;
  const zone = await DeliveryZone.findOne({ pincodes: pincode, active: true }).lean();
  if (!zone) return res.json({ deliverable: false });
  res.json({ deliverable: true, fee: zone.fee, minOrder: zone.minOrder, etaMin: zone.etaMin, zone: zone.name });
});

// Admin CRUD
r.get('/admin', auth('admin'), async (_req, res) => {
  res.json(await DeliveryZone.find().sort({ createdAt: -1 }).lean());
});

r.post('/admin', auth('admin'), async (req, res) => {
  const body = zoneSchema.parse(req.body);
  const zone = await DeliveryZone.create(body);
  res.status(201).json(zone);
});

r.patch('/admin/:id', auth('admin'), async (req, res) => {
  const body = zoneSchema.partial().parse(req.body);
  const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!zone) throw httpError(404, 'Zone not found');
  res.json(zone);
});

r.delete('/admin/:id', auth('admin'), async (req, res) => {
  const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
  if (!zone) throw httpError(404, 'Zone not found');
  res.json({ message: 'Zone deleted' });
});

export default r;
