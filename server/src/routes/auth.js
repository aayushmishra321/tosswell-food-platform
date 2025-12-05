import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '../models.js';
import { signAccess, signRefresh, verifyRefresh, auth, httpError, sha256 } from '../middleware.js';
import { sendMail } from '../mailer.js';

const r = Router();
const newToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
};
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const email = z.string().email('Enter a valid email address').transform((e) => e.toLowerCase());
const password = z.string().min(8, 'Password must be at least 8 characters');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, COOKIE_OPTS);
}
function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 });
}

// ── Register ─────────────────────────────────────────────────────────────────
r.post('/register', async (req, res) => {
  const body = z.object({
    name:         z.string().trim().min(2, 'Enter your name'),
    email,
    password,
    referralCode: z.string().trim().optional(),
  }).parse(req.body);

  if (await User.exists({ email: body.email })) throw httpError(409, 'An account with this email already exists');

  // Validate referral code
  let referrer = null;
  if (body.referralCode) {
    referrer = await User.findOne({ referralCode: body.referralCode.toUpperCase() }).lean();
    // Silently ignore invalid codes — don't block registration
  }

  const t = newToken();
  const newUser = await User.create({
    name:            body.name,
    email:           body.email,
    passwordHash:    await bcrypt.hash(body.password, 12),
    verifyTokenHash: t.hash,
    verifyExpires:   new Date(Date.now() + 24 * 3600 * 1000),
    ...(referrer && { referredBy: referrer._id }),
  });

  // Create referral record (reward will be granted after first order)
  if (referrer && referrer._id.toString() !== newUser._id.toString()) {
    const { Referral } = await import('../models.js');
    await Referral.create({
      referrer:  referrer._id,
      referred:  newUser._id,
      code:      body.referralCode.toUpperCase(),
    }).catch(() => {}); // ignore duplicate errors
  }

  await sendMail({
    to:      body.email,
    subject: 'Verify your Tosswell Pizza account',
    text:    `Hi ${body.name},\n\nConfirm your email:\n${clientUrl()}/verify/${t.raw}\n(Valid 24 hours)`,
  });
  res.status(201).json({ message: 'Account created. Check your inbox for the verification link.' });
});

// ── Verify email ─────────────────────────────────────────────────────────────
r.post('/verify', async (req, res) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const user = await User.findOneAndUpdate(
    { verifyTokenHash: sha256(token), verifyExpires: { $gt: new Date() } },
    { verified: true, $unset: { verifyTokenHash: 1, verifyExpires: 1 } },
  );
  if (!user) throw httpError(400, 'This verification link is invalid or has expired');
  res.json({ message: 'Email verified. You can log in now.' });
});

// ── Login ─────────────────────────────────────────────────────────────────────
r.post('/login', async (req, res) => {
  const body = z.object({ email, password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: body.email, role: 'user' });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash)))
    throw httpError(401, 'Incorrect email or password');
  if (!user.verified) throw httpError(403, 'Verify your email first. Check your inbox for the link.');

  const refresh = signRefresh(user);
  user.refreshTokenHash = sha256(refresh);
  await user.save();

  setRefreshCookie(res, refresh);
  res.json({ token: signAccess(user), user: publicUser(user) });
});

// ── Refresh access token ──────────────────────────────────────────────────────
r.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw httpError(401, 'No refresh token');
  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw httpError(401, 'Refresh token expired or invalid');
  }
  const user = await User.findById(payload.id);
  if (!user || user.refreshTokenHash !== sha256(token))
    throw httpError(401, 'Refresh token revoked');

  // Token rotation: issue new refresh token each time
  const newRefresh = signRefresh(user);
  user.refreshTokenHash = sha256(newRefresh);
  await user.save();

  setRefreshCookie(res, newRefresh);
  res.json({ token: signAccess(user), user: publicUser(user) });
});

// ── Logout ────────────────────────────────────────────────────────────────────
r.post('/logout', auth(), async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $unset: { refreshTokenHash: 1 } });
  clearRefreshCookie(res);
  res.json({ message: 'Logged out' });
});

// ── Forgot password ───────────────────────────────────────────────────────────
r.post('/forgot', async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  const user = await User.findOne({ email: body.email, role: 'user' });
  if (user) {
    const t = newToken();
    user.resetTokenHash = t.hash;
    user.resetExpires = new Date(Date.now() + 3600 * 1000);
    await user.save();
    await sendMail({
      to: user.email,
      subject: 'Reset your Tosswell Pizza password',
      text: `Use this link to choose a new password (valid for 1 hour):\n${clientUrl()}/reset/${t.raw}\n`,
    });
  }
  res.json({ message: "If that email has an account, a reset link is on its way." });
});

// ── Reset password ────────────────────────────────────────────────────────────
r.post('/reset', async (req, res) => {
  const body = z.object({ token: z.string().min(10), password }).parse(req.body);
  const user = await User.findOne({ resetTokenHash: sha256(body.token), resetExpires: { $gt: new Date() } });
  if (!user) throw httpError(400, 'This reset link is invalid or has expired');
  user.passwordHash = await bcrypt.hash(body.password, 12);
  user.resetTokenHash = user.resetExpires = undefined;
  // Revoke all refresh tokens on password change
  user.refreshTokenHash = undefined;
  await user.save();
  res.json({ message: 'Password updated. You can log in now.' });
});

// ── Me ────────────────────────────────────────────────────────────────────────
r.get('/me', auth(), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(401, 'Please log in to continue');
  res.json(publicUser(user));
});

export default r;
