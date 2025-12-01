# Tosswell Pizza — AI-Powered Pizza Ordering Platform

> OIBSIP Web Development Internship · Level 3

A full-stack MERN pizza ordering application with AI assistance, real-time order tracking, loyalty rewards, wishlist, Razorpay payments, coupon management, delivery addresses, analytics, and a complete admin dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios, Socket.IO Client, Recharts, react-hot-toast |
| Backend | Node.js 24, Express 5, Mongoose 9, Zod 4, Socket.IO, Morgan |
| Database | MongoDB (local Community Edition) |
| AI | Google Gemini API (`gemini-3.8-flash`) with function calling |
| Vector DB | Qdrant (local Docker, for RAG) |
| Payments | Razorpay test mode |
| Email | Nodemailer + Gmail SMTP (console fallback in dev) |
| Images | Cloudinary (optional) + Unsplash CDN seed + SVG fallback |
| Auth | JWT access tokens (15 min) + HttpOnly refresh tokens (7 days) |
| DevOps | Docker Compose (MongoDB + Qdrant + server + Nginx client) |

---

## Quick Start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cd ../server
cp .env.example .env
# Fill in JWT_SECRET, JWT_REFRESH_SECRET, Razorpay keys, Gemini API key, Gmail SMTP

# 3. Seed database
npm run seed          # inventory + 6 pizzas + admin account
npm run seed:images   # adds Unsplash CDN images to all 6 pizzas

# 4. Start backend  (terminal 1)
npm run dev           # http://localhost:5000

# 5. Start frontend (terminal 2)
cd ../client && npm run dev   # http://localhost:5173
```

**Admin login:** `http://localhost:5173/admin/login`
Credentials: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`

---

## Public Access (no login required)

- `/` — Homepage with hero, bestsellers, categories, AI promo, reviews, loyalty promo
- `/menu` — Full menu with search, filters, sorting, pizza detail modal
- `/build` — Custom pizza builder (AI generator available without login; cart requires login)

---

## Customer Features

| Feature | Details |
|---|---|
| Auth | Register → email verify → login with JWT + HttpOnly refresh cookie |
| Token refresh | Automatic silent refresh via Axios interceptor |
| Cart | localStorage persisted, quantity controls, thumbnails |
| Checkout | Address selector, coupon dropdown, loyalty points redemption, Razorpay |
| Orders | Real-time status via Socket.IO, 6-stage tracker, reorder, review |
| Addresses | Add/edit/delete/default |
| Account | Profile edit, change password, loyalty points + tier history |
| Wishlist | Add/remove favourites, quick add to cart |
| Loyalty | Earn 1 pt per ₹10, Bronze/Silver/Gold tiers, redeem at checkout |
| AI Chat | Tossy floating widget — Gemini function calling against live menu |
| AI Builder | Describe a pizza → AI generates valid ingredient config |

---

## Admin Dashboard (sidebar layout)

| Tab | Features |
|---|---|
| Overview | Revenue, orders, customers, low-stock alerts, revenue chart, top pizzas |
| Orders | Paginated, search by customer, filter by status, expand for details, update status |
| Inventory | Edit stock and threshold per ingredient, low-stock badges |
| Coupons | Create % and fixed coupons, enable/disable, delete, full rules |
| Customers | Paginated list with spend totals, loyalty tier, view order history |
| Reviews | Moderation (show/hide), sentiment badge |
| Images | Upload/replace/delete per pizza via Cloudinary |
| Analytics | Revenue chart, top pizzas, hourly heatmap, order status pie, daily orders |

---

## API Endpoints

### Public
- `GET /api/menu` — full menu + inventory options
- `GET /api/reviews/recent` — latest visible reviews for homepage
- `GET /api/reviews/pizza/:id` — reviews for a specific pizza

### Auth — `/api/auth`
- `POST /register` `POST /verify` `POST /login` `POST /refresh` `POST /logout`
- `POST /forgot` `POST /reset` `GET /me`

### Customer (requires login)
- `GET/POST/PATCH/DELETE /api/addresses` — address management
- `POST /api/addresses/:id/default`
- `GET /api/coupons` — available coupons for checkout dropdown
- `POST /api/coupons/validate` — validate + preview discount
- `POST /api/orders` — create order
- `POST /api/orders/verify` — verify Razorpay payment
- `GET /api/orders/mine` — paginated order history
- `POST /api/orders/:id/reorder`
- `GET/POST/DELETE /api/wishlist`
- `POST /api/wishlist/:pizzaId` — toggle wishlist
- `GET /api/loyalty` — points, tier, history
- `GET/PATCH /api/users/profile`
- `POST /api/users/change-password`
- `POST /api/reviews` `DELETE /api/reviews/:id`
- `POST /api/ai/chat` — Tossy chat
- `POST /api/ai/suggest-pizza` — AI pizza generator

### Admin — `/api/admin`
- `POST /login`
- `GET/PATCH /inventory/:id`
- `GET/PATCH /orders/:id/status`
- `GET /analytics`
- `GET/POST/PATCH/DELETE /coupons`
- `GET /customers` `GET /customers/:id/orders`
- `GET/PATCH /reviews/:id`

### Images — `/api/images`
- `POST /pizza/:id` — upload/replace (admin, multipart)
- `DELETE /pizza/:id` — remove (admin)

---

## Database Schemas

| Model | Key fields |
|---|---|
| User | name, email, passwordHash, role, verified, refreshTokenHash, loyaltyPoints, loyaltyTier, referralCode |
| Pizza | name, description, price, base, sauce, cheese, veggies, isVeg, spiceLevel, soldCount, image |
| Inventory | category, name, price, stock, threshold, lowStockAlerted |
| Order | user, items (with imageUrl snapshot), subtotal, discount, loyaltyDiscount, total, coupon, address, status |
| Address | user, label, line1, line2, city, state, pincode, isDefault |
| Coupon | code, type, value, minOrder, maxDiscount, expiresAt, usageLimit, perUserLimit, active, usedBy |
| Review | user, order, pizza, rating, comment, sentiment, visible |
| Wishlist | user, pizzas[] |
| LoyaltyTx | user, type (earn/redeem/bonus), points, description, order |

---

## Docker

Start the full stack (MongoDB + Qdrant + server + Nginx):

```bash
docker compose up --build
```

App available at `http://localhost` (port 80).

Qdrant dashboard at `http://localhost:6333/dashboard`.

---

## Environment Variables

See `server/.env.example` for the full list with comments.

Required to start:
- `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`

Optional:
- `SMTP_*` — real email (console fallback without it)
- `CLOUDINARY_*` — admin image upload (SVG fallback without it)
- `QDRANT_URL` — RAG support bot (gracefully disabled without it)

---

## Seed Data

| Pizza | Price | Veg | Spice |
|---|---|---|---|
| Margherita | ₹249 | ✓ | Mild |
| Farmhouse | ₹329 | ✓ | Mild |
| Peri-Peri Paneer | ₹349 | ✓ | Hot |
| Garden Pesto | ₹369 | ✓ | Mild |
| Smoky Corn Barbecue | ₹339 | ✓ | Medium |
| Burst Supreme | ₹429 | ✓ | Medium |

---

*OIBSIP Web Development Internship — Level 3 · Tosswell Pizza*
