import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
const ACCESS_EXPIRY  = process.env.ACCESS_TOKEN_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Sign a short-lived access token
export const signAccess = (u) =>
  jwt.sign({ id: u.id || u._id, role: u.role }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

// Sign a long-lived refresh token
export const signRefresh = (u) =>
  jwt.sign({ id: u.id || u._id, role: u.role }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

// Kept for backwards compat within same session — just calls signAccess
export const sign = signAccess;

// Middleware: auth('user') | auth('admin') | auth() = any role
export const auth =
  (...roles) =>
  (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const payload = jwt.verify(token, ACCESS_SECRET);
      if (roles.length && !roles.includes(payload.role))
        return res.status(403).json({ message: 'Forbidden' });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ message: 'Please log in to continue' });
    }
  };

// Verify a refresh token (used in /auth/refresh)
export const verifyRefresh = (token) => jwt.verify(token, REFRESH_SECRET);

export const httpError = (status, message) => Object.assign(new Error(message), { status });
