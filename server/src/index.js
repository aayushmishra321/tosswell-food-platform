import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Server as SocketIO } from 'socket.io';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

import authRoutes    from './routes/auth.js';
import menuRoutes    from './routes/menu.js';
import orderRoutes   from './routes/orders.js';
import adminRoutes   from './routes/admin.js';
import addressRoutes from './routes/addresses.js';
import couponRoutes  from './routes/coupons.js';
import reviewRoutes  from './routes/reviews.js';
import aiRoutes      from './routes/ai.js';
import imageRoutes   from './routes/images.js';
import wishlistRoutes  from './routes/wishlist.js';
import loyaltyRoutes   from './routes/loyalty.js';
import userRoutes      from './routes/users.js';
import ragRoutes       from './routes/rag.js';
import referralRoutes  from './routes/referral.js';
import refundRoutes    from './routes/refunds.js';
import reportsRoutes   from './routes/reports.js';
import zonesRoutes     from './routes/zones.js';
import pushRoutes      from './routes/push.js';
import { startStockJob } from './jobs/stockAlert.js';

// ── Env validation ────────────────────────────────────────────────────────
const required = ['MONGO_URI', 'JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'GEMINI_API_KEY'];
for (const k of required)
  if (!process.env[k]) throw new Error(`Missing env var: ${k}`);

if (process.env.JWT_SECRET === 'change-me-to-a-long-random-string')
  throw new Error('JWT_SECRET is still the placeholder. Set a real secret in .env');

// ── Express ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 });

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth',          limiter, authRoutes);
app.use('/api/admin/login',   limiter);
app.use('/api/admin',         adminRoutes);
app.use('/api/menu',          menuRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/addresses',     addressRoutes);
app.use('/api/coupons',       couponRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/images',        imageRoutes);
app.use('/api/wishlist',      wishlistRoutes);
app.use('/api/loyalty',       loyaltyRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/rag',           ragRoutes);
app.use('/api/referral',      referralRoutes);
app.use('/api/refunds',       refundRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/zones',         zonesRoutes);
app.use('/api/push',          pushRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError)
    return res.status(400).json({ message: err.issues[0]?.message || 'Invalid input' });
  if (err.error?.description)
    return res.status(502).json({ message: `Payment provider: ${err.error.description}` });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong' });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    socket.role = payload.role;
    next();
  } catch { next(new Error('Unauthorized')); }
});

io.on('connection', (socket) => {
  socket.on('joinOrder',  (id) => socket.join(`order:${id}`));
  socket.on('leaveOrder', (id) => socket.leave(`order:${id}`));
});

app.set('io', io);

// ── Start ─────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URI);
console.log('MongoDB connected');

const port = Number(process.env.PORT) || 5000;
server.listen(port, () => console.log(`API + WS listening on :${port}`));
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

startStockJob();
