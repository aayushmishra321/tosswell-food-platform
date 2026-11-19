<div align="center">

# 🍕 Tosswell Pizza

### AI-Powered Full-Stack Pizza Ordering Platform

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Community-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-02042B?style=flat-square&logo=razorpay&logoColor=white)](https://razorpay.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A production-ready MERN application featuring an AI pizza assistant, real-time order tracking, loyalty rewards, RAG-powered support bot, and a complete restaurant management dashboard.**

[✨ Features](#-features) · [🚀 Quick Start](#-quick-start) · [🏗️ Architecture](#-architecture) · [📡 API Reference](#-api-reference) · [🐳 Docker](#-docker-deployment) · [🤝 Contributing](#-contributing)

---

![Tosswell Pizza Banner](https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=80&fit=crop)

</div>

---

## ✨ Features

### 👤 Customer Experience
- **Public homepage** — hero section, bestsellers, categories, promotions, reviews
- **Menu** — search, sort, veg filter, spice filter, ratings, pizza detail modal
- **Custom pizza builder** — 4-step wizard with live price calculation
- **AI pizza generator** — describe preferences in plain English, AI picks valid ingredients
- **Cart** — localStorage persistence, thumbnails, quantity controls
- **Checkout** — saved addresses, coupon codes, loyalty point redemption, Razorpay
- **Real-time order tracking** — 6-stage status via Socket.IO (no polling)
- **Order history** — reorder with live prices, leave reviews
- **Wishlist** — persistent across devices via MongoDB
- **Loyalty program** — earn points per ₹10, Bronze → Silver → Gold tiers
- **Referral system** — unique codes, bonus points for referrer and referee
- **PWA support** — installable on mobile, offline caching, push notifications

### 🤖 AI Features (Gemini)
- **Tossy chat widget** — floating assistant using Gemini function calling against live menu
- **AI pizza generator** — backend-validated ingredient selection from live inventory
- **RAG support bot** — Qdrant vector search + Gemini for policy and menu Q&A
- **Sentiment analysis** — automatic review classification (Positive / Neutral / Negative)
- **Inventory forecasting** — demand prediction from historical order data
- **Business insights** — Gemini-generated operational recommendations for admins

### 🏪 Admin Dashboard
| Module | Capabilities |
|---|---|
| **Overview** | Live revenue, orders, customer stats, low-stock alerts, charts |
| **Orders** | Paginated, searchable, expandable order details, status management |
| **Inventory** | Stock + threshold editing, movement history, low-stock badges |
| **Coupons** | % and fixed discounts, expiry, usage limits, analytics |
| **Customers** | Spend totals, loyalty tier, order history per customer |
| **Reviews** | Show/hide moderation, sentiment badges, batch AI classification |
| **Images** | Upload / replace / delete pizza photos via Cloudinary |
| **Analytics** | Revenue charts, top pizzas, hourly heatmap, status distribution |
| **AI Insights** | Gemini business analysis, sentiment trends, inventory forecast |
| **Refunds** | Customer requests, approve / reject / mark processed |
| **Reports** | CSV, Excel, PDF invoice download with auth |
| **Zones** | Delivery zone and fee configuration per pincode |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| **Real-time** | Socket.IO (client + server) |
| **Charts** | Recharts |
| **Backend** | Node.js 24, Express 5, Zod 4, Morgan |
| **Database** | MongoDB Community Edition (local) + Mongoose 9 |
| **Vector DB** | Qdrant (local Docker) for RAG |
| **AI** | Google Gemini API — `gemini-3.8-flash` with function calling |
| **Auth** | JWT access tokens (15 min) + HttpOnly refresh tokens (7 days) |
| **Payments** | Razorpay (test mode) |
| **Email** | Nodemailer + Gmail SMTP |
| **Images** | Cloudinary (optional) · Unsplash CDN seed · SVG fallback |
| **DevOps** | Docker Compose · Nginx |

---

## 🏗️ Architecture

```
tosswell-food-platform/
├── client/                         # React + Vite frontend
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   └── sw.js                   # Service worker
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Public nav + footer
│   │   │   └── AdminLayout.jsx     # Sidebar dashboard shell
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Public landing page
│   │   │   ├── Menu.jsx            # Pizza listing + filters
│   │   │   ├── Builder.jsx         # Custom pizza wizard
│   │   │   ├── Checkout.jsx        # Cart + payment
│   │   │   ├── Orders.jsx          # Order history + tracking
│   │   │   ├── Account.jsx         # Profile + loyalty + referral
│   │   │   ├── Wishlist.jsx
│   │   │   ├── Support.jsx         # RAG chatbot
│   │   │   ├── AiChat.jsx          # Tossy floating widget
│   │   │   └── admin/              # 11 admin sub-pages
│   │   ├── App.jsx                 # Route definitions
│   │   ├── api.js                  # Axios + auto token refresh
│   │   ├── auth.jsx                # Auth context
│   │   ├── cart.jsx                # Cart context
│   │   └── socket.js               # Socket.IO singleton
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/                         # Express API
│   ├── src/
│   │   ├── routes/                 # 18 route modules
│   │   │   ├── auth.js             # Register, login, refresh, logout
│   │   │   ├── menu.js             # Public menu + ratings
│   │   │   ├── orders.js           # Create, verify, history, reorder
│   │   │   ├── admin.js            # Full admin API
│   │   │   ├── ai.js               # Chat, suggest, sentiment, forecast
│   │   │   ├── rag.js              # RAG support bot (Qdrant)
│   │   │   ├── loyalty.js          # Points + tiers
│   │   │   ├── referral.js         # Referral codes + rewards
│   │   │   ├── refunds.js          # Refund lifecycle
│   │   │   ├── reports.js          # CSV, Excel, PDF export
│   │   │   ├── zones.js            # Delivery zones
│   │   │   ├── push.js             # Web push notifications
│   │   │   └── ...                 # addresses, coupons, reviews,
│   │   │                           # images, wishlist, users
│   │   ├── jobs/
│   │   │   └── stockAlert.js       # node-cron low-stock emails
│   │   ├── models.js               # 15 Mongoose schemas
│   │   ├── middleware.js           # JWT auth helpers
│   │   ├── mailer.js               # HTML email templates
│   │   ├── cloudinary.js           # Image upload helper
│   │   ├── rag-ingest.js           # Qdrant indexing script
│   │   ├── seed.js                 # DB seed
│   │   └── seed-images.js          # Pizza image seed
│   ├── .env.example
│   └── Dockerfile
│
└── docker-compose.yml              # MongoDB + Qdrant + server + client
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- MongoDB Community Edition (running locally)
- Git

### 1. Clone and install
```bash
git clone https://github.com/aayushmishra321/tosswell-food-platform.git
cd tosswell-food-platform

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment
```bash
cd server
cp .env.example .env
# Edit .env — fill in the required values listed below
```

**Required variables:**
```env
MONGO_URI=mongodb://127.0.0.1:27017/tosswell
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<different 64-byte hex>
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Seed the database
```bash
cd server
npm run seed          # Creates inventory, 6 pizzas, admin account
npm run seed:images   # Seeds Unsplash CDN images for all pizzas
```

### 4. Start the application
```bash
# Terminal 1 — API server
cd server && npm run dev      # http://localhost:5000

# Terminal 2 — React frontend
cd client && npm run dev      # http://localhost:5173
```

### 5. Access the app
| URL | Description |
|---|---|
| `http://localhost:5173` | Customer website (public) |
| `http://localhost:5173/admin/login` | Admin dashboard |
| `http://localhost:5000/api/menu` | API health check |

**Default admin:** use `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`

---

## 🧪 Test Payments (Razorpay Test Mode)

| Method | Details |
|---|---|
| **UPI** | `success@razorpay` → instant success |
| **Card (Visa)** | `4718 6090 1998 9292` · any future expiry · CVV `123` |
| **Card (Mastercard)** | `5267 3181 8797 5449` · any future expiry · CVV `123` |
| **OTP** | Enter `1234` on the 3D Secure screen |

---

## 🤖 AI Setup

### Tossy Chat Widget + Pizza Generator
Works out of the box with your `GEMINI_API_KEY`. The widget uses Gemini function calling against your live MongoDB data — it cannot invent products or prices.

### RAG Support Bot
Requires a local Qdrant instance. Run once:

```bash
# Start Qdrant (keep running in background)
docker run -d -p 6333:6333 --name qdrant qdrant/qdrant

# Index the knowledge base (run after any menu/policy changes)
cd server && npm run seed:rag
```

The support bot answers questions about menu, allergens, delivery policy, refunds, and payments — grounded in your actual knowledge base. If Qdrant is unavailable, the app continues to work and shows a friendly offline message.

---

## 🐳 Docker Deployment

Start the entire stack with one command:

```bash
docker compose up --build
```

| Service | Port | Description |
|---|---|---|
| `client` | `80` | React app served via Nginx |
| `server` | `5000` | Express API + Socket.IO |
| `mongo` | internal | MongoDB 7 with persistent volume |
| `qdrant` | `6333` | Vector database for RAG |

> **Note:** Copy `server/.env.example` to `server/.env` and fill in credentials before building.

---

## 📡 API Reference

### Public endpoints (no auth)
```
GET  /api/menu                    Full menu + inventory options
GET  /api/reviews/recent          Recent homepage reviews
GET  /api/reviews/pizza/:id       Reviews for a pizza
GET  /api/zones/lookup/:pincode   Delivery fee for a pincode
GET  /api/rag/status              RAG bot availability
POST /api/rag/ask                 Support bot question
```

### Auth — `/api/auth`
```
POST /register   POST /verify    POST /login
POST /refresh    POST /logout    POST /forgot
POST /reset      GET  /me
```

### Customer (JWT required)
```
# Orders
POST /api/orders                  Place order + create Razorpay order
POST /api/orders/verify           Verify payment signature
GET  /api/orders/mine             Paginated order history
POST /api/orders/:id/reorder      Reorder with live prices

# Profile & preferences
GET  /api/users/profile           PATCH /api/users/profile
POST /api/users/change-password
GET  /api/loyalty                 Points, tier, history
GET  /api/referral                Referral code + stats

# Shopping
GET/POST       /api/wishlist
POST           /api/wishlist/:pizzaId   Toggle
GET            /api/coupons            Available coupons
POST           /api/coupons/validate   Preview discount
GET/POST/PATCH/DELETE /api/addresses
POST           /api/addresses/:id/default

# AI
POST /api/ai/chat                 Tossy multi-turn chat
POST /api/ai/suggest-pizza        AI custom pizza generator

# Reviews & refunds
POST   /api/reviews               Submit (delivered orders only)
DELETE /api/reviews/:id
POST   /api/refunds               Request refund
GET    /api/refunds/mine
```

### Admin (admin JWT required)
```
GET  /api/admin/analytics         Full analytics data
GET  /api/admin/orders            Paginated + filterable
PATCH /api/admin/orders/:id/status
GET  /api/admin/inventory         PATCH /api/admin/inventory/:id
GET/POST/PATCH/DELETE /api/admin/coupons
GET  /api/admin/customers         GET /api/admin/customers/:id/orders
GET  /api/admin/reviews           PATCH /api/admin/reviews/:id
GET  /api/admin/activity-logs

# AI admin
POST /api/ai/sentiment            Classify one review
POST /api/ai/sentiment/batch      Classify all unclassified
GET  /api/ai/forecast             Inventory demand forecast
GET  /api/ai/insights             Gemini business insights

# Reports (streamed, auth via JWT)
GET  /api/reports/orders.csv
GET  /api/reports/orders.xlsx
GET  /api/reports/inventory.csv
GET  /api/reports/invoice/:id     PDF invoice
GET  /api/reports/stock-history/:id

# Configuration
GET/POST/PATCH/DELETE /api/zones/admin
GET/PATCH /api/refunds

# Images
POST   /api/images/pizza/:id      Upload / replace
DELETE /api/images/pizza/:id
GET    /api/images/status         Cloudinary config status

# Push notifications
GET    /api/push/vapid-public
POST   /api/push/subscribe
DELETE /api/push/unsubscribe
PATCH  /api/push/preferences
```

---

## 🗄️ Database Schemas

| Model | Purpose |
|---|---|
| `User` | Accounts, auth tokens, loyalty, referral code |
| `Pizza` | Menu items with images, spice level, sold count |
| `Inventory` | Ingredient stock with low-stock threshold |
| `Order` | Full order with items snapshot, payment, address |
| `Address` | Saved delivery addresses per user |
| `Coupon` | Discount codes with usage rules |
| `Review` | Star ratings + comments + sentiment |
| `Wishlist` | Saved favourite pizzas per user |
| `LoyaltyTx` | Points earn/redeem transaction history |
| `Referral` | Referral tracking with reward status |
| `Refund` | Refund request lifecycle |
| `StockMovement` | Inventory change history |
| `DeliveryZone` | Pincode → fee mapping |
| `PushSub` | Browser push subscriptions |
| `ActivityLog` | Admin action audit trail |

---

## 🌱 Seed Data

```bash
npm run seed          # Required — sets up inventory + pizzas + admin
npm run seed:images   # Recommended — adds real pizza photography
npm run seed:rag      # Optional — indexes knowledge base in Qdrant
```

**Seeded pizzas:**

| Pizza | Price | Spice |
|---|---|---|
| Margherita | ₹249 | Mild |
| Farmhouse | ₹329 | Mild |
| Peri-Peri Paneer | ₹349 | Hot |
| Garden Pesto | ₹369 | Mild |
| Smoky Corn Barbecue | ₹339 | Medium |
| Burst Supreme | ₹429 | Medium |

---

## 🔐 Security

- Passwords hashed with **bcrypt** (cost 12)
- JWT access tokens expire in **15 minutes**
- Refresh tokens stored as **SHA-256 hashes** — plaintext never touches the database
- **Token rotation** — new refresh token issued on every refresh
- **Server-side logout** — refresh token hash deleted, old tokens dead immediately
- **Payment verification** — HMAC-SHA256 with `timingSafeEqual` (prevents timing attacks)
- **Idempotent payments** — double-confirmation impossible via atomic `findOneAndUpdate`
- Prices and stock **always computed server-side** — client values never trusted
- **Account enumeration prevention** — forgot password returns identical response for known/unknown emails
- Helmet, CORS, and **rate limiting** on all auth endpoints

---

## 📧 Email Notifications

Triggered automatically via Gmail SMTP (or logged to console in dev):

| Trigger | Recipient |
|---|---|
| Registration | Email verification link |
| Forgot password | Reset link (1 hour expiry) |
| Order confirmed | Itemised HTML receipt |
| Preparing / Out for Delivery / Delivered | Status update |
| Cancelled | Cancellation notice |
| Low stock | Admin alert (once per dip) |

---

## 🤝 Contributing

```bash
# Fork the repo, then:
git clone https://github.com/<your-username>/tosswell-food-platform.git
cd tosswell-food-platform

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then
npm run build   # verify frontend builds
git commit -m "Your descriptive message"
git push origin feature/your-feature-name

# Open a Pull Request on GitHub
```

**Please ensure:**
- Frontend builds without errors (`cd client && npm run build`)
- Server files pass syntax check (`node --check src/index.js`)
- No `.env` files or secrets are committed
- New routes include Zod validation
- New admin routes include `auth('admin')` middleware

---

## 📄 License

MIT © [Aayush Mishra](https://github.com/aayushmishra321)

---

<div align="center">

**Built with ❤️ using the MERN stack + Gemini AI**

[⬆ Back to top](#-tosswell-pizza)

</div>
