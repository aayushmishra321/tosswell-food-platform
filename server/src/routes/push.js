import { Router } from 'express';
import * as webpush from 'web-push';
import { z } from 'zod';
import { PushSub } from '../models.js';
import { auth } from '../middleware.js';

const r = Router();

// VAPID keys — generate once with: npx web-push generate-vapid-keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_USER || 'admin@tosswell.test'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// GET /api/push/vapid-public — client needs this to subscribe
r.get('/vapid-public', (_req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.json({ key: null });
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save subscription
r.post('/subscribe', auth(), async (req, res) => {
  const body = z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
    preferences: z.object({
      orderUpdates: z.boolean().optional(),
      promotions:   z.boolean().optional(),
    }).optional(),
  }).parse(req.body);

  await PushSub.findOneAndUpdate(
    { endpoint: body.endpoint },
    {
      user:     req.user.id,
      endpoint: body.endpoint,
      keys:     body.keys,
      ...(body.preferences && { preferences: body.preferences }),
    },
    { upsert: true, new: true },
  );
  res.json({ subscribed: true });
});

// DELETE /api/push/unsubscribe
r.delete('/unsubscribe', auth(), async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  await PushSub.deleteOne({ endpoint, user: req.user.id });
  res.json({ unsubscribed: true });
});

// PATCH /api/push/preferences
r.patch('/preferences', auth('user'), async (req, res) => {
  const body = z.object({
    orderUpdates: z.boolean().optional(),
    promotions:   z.boolean().optional(),
  }).parse(req.body);
  await PushSub.updateMany(
    { user: req.user.id },
    { $set: { 'preferences.orderUpdates': body.orderUpdates, 'preferences.promotions': body.promotions } },
  );
  res.json({ updated: true });
});

// Helper: send push to all subscriptions for a user
export async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured
  const subs = await PushSub.find({ user: userId }).lean();
  const dead = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
      );
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) dead.push(sub._id);
    }
  }
  if (dead.length) await PushSub.deleteMany({ _id: { $in: dead } });
}

export default r;
