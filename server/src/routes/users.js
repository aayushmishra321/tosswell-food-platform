import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Order } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();
r.use(auth('user'));

// GET /api/users/profile
r.get('/profile', async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-passwordHash -refreshTokenHash -verifyTokenHash -resetTokenHash')
    .lean();
  if (!user) throw httpError(404, 'User not found');
  res.json(user);
});

// PATCH /api/users/profile
r.patch('/profile', async (req, res) => {
  const body = z.object({
    name:  z.string().trim().min(2).optional(),
    phone: z.string().trim().optional(),
    dob:   z.string().datetime().optional(),
  }).parse(req.body);
  const user = await User.findByIdAndUpdate(req.user.id, body, { new: true })
    .select('-passwordHash -refreshTokenHash -verifyTokenHash -resetTokenHash');
  res.json(user);
});

// POST /api/users/change-password
r.post('/change-password', async (req, res) => {
  const { current, next } = z.object({
    current: z.string().min(1),
    next:    z.string().min(8, 'Password must be at least 8 characters'),
  }).parse(req.body);

  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, 'User not found');
  if (!(await bcrypt.compare(current, user.passwordHash)))
    throw httpError(400, 'Current password is incorrect');

  user.passwordHash    = await bcrypt.hash(next, 12);
  user.refreshTokenHash = undefined; // revoke sessions
  await user.save();
  res.json({ message: 'Password changed. Please log in again.' });
});

export default r;
