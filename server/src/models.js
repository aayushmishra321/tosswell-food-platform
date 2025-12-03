import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const CATEGORIES = ['base', 'sauce', 'cheese', 'veggie'];
export const STATUSES = [
  'Awaiting Payment',
  'Order Placed',
  'Payment Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

// ── User ────────────────────────────────────────────────────────────────────
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    verified: { type: Boolean, default: false },
    verifyTokenHash: String,
    verifyExpires: Date,
    resetTokenHash: String,
    resetExpires: Date,
    refreshTokenHash: String,
    // Profile extras
    phone: { type: String, trim: true },
    dob: { type: Date },
    // Loyalty
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTier: { type: String, enum: ['Bronze', 'Silver', 'Gold'], default: 'Bronze' },
    // Referral
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Notification preferences
    notificationPrefs: {
      orderUpdates: { type: Boolean, default: true },
      promotions:   { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// ── Inventory ───────────────────────────────────────────────────────────────
const inventorySchema = new Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 100 },
  threshold: { type: Number, min: 0, default: 20 },
  lowStockAlerted: { type: Boolean, default: false },
});
inventorySchema.index({ category: 1, name: 1 }, { unique: true });

// ── Pizza ────────────────────────────────────────────────────────────────────
const pizzaSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  price: { type: Number, required: true },
  base: String,
  sauce: String,
  cheese: String,
  veggies: [String],
  available: { type: Boolean, default: true },
  isVeg: { type: Boolean, default: true },
  spiceLevel: { type: String, enum: ['Mild', 'Medium', 'Hot'], default: 'Medium' },
  image: {
    url: String,
    thumb: String,
    publicId: String,
    alt: String,
  },
  soldCount: { type: Number, default: 0 }, // for bestseller badge
});
pizzaSchema.index({ soldCount: -1 });

// ── Address ──────────────────────────────────────────────────────────────────
const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, default: 'Home' },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true, match: /^\d{6}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Coupon ───────────────────────────────────────────────────────────────────
const couponSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    expiresAt: { type: Date },
    usageLimit: { type: Number },
    perUserLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);
couponSchema.index({ code: 1 }, { unique: true });

// ── Order ────────────────────────────────────────────────────────────────────
const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        name: String,
        price: Number,
        qty: Number,
        base: String,
        sauce: String,
        cheese: String,
        veggies: [String],
        pizzaId: { type: Schema.Types.ObjectId, ref: 'Pizza' },
        imageUrl: String,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: String },
    pointsUsed: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    address: {
      label: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    deliveryInstructions: String,
    status: { type: String, enum: STATUSES, default: 'Awaiting Payment' },
    deliveryFee:      { type: Number, default: 0 },
    deliveryZone:     { type: String },
    scheduledAt:      { type: Date },   // null = ASAP order
    razorpayOrderId: String,
    paymentId: String,
    estimatedDelivery: Date,
  },
  { timestamps: true },
);
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// ── Review ───────────────────────────────────────────────────────────────────
const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    pizza: { type: Schema.Types.ObjectId, ref: 'Pizza' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    sentiment: { type: String, enum: ['Positive', 'Neutral', 'Negative'] },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, order: 1 }, { unique: true });
reviewSchema.index({ pizza: 1, visible: 1 });

// ── Wishlist ─────────────────────────────────────────────────────────────────
const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pizzas: [{ type: Schema.Types.ObjectId, ref: 'Pizza' }],
  },
  { timestamps: true },
);

// ── Loyalty Transaction ───────────────────────────────────────────────────────
const loyaltyTxSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['earn', 'redeem', 'expire', 'bonus'], required: true },
    points: { type: Number, required: true },
    description: { type: String },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);
export const Inventory = model('Inventory', inventorySchema);
export const Pizza = model('Pizza', pizzaSchema);
export const Address = model('Address', addressSchema);
export const Coupon = model('Coupon', couponSchema);
export const Order = model('Order', orderSchema);
export const Review = model('Review', reviewSchema);
export const Wishlist = model('Wishlist', wishlistSchema);
export const LoyaltyTx = model('LoyaltyTx', loyaltyTxSchema);

// ── Stock Movement History ────────────────────────────────────────────────────
const stockMovementSchema = new Schema(
  {
    inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
    category:  String,
    name:      String,
    before:    { type: Number, required: true },
    after:     { type: Number, required: true },
    delta:     { type: Number, required: true }, // positive = restock, negative = consumption
    reason:    { type: String, enum: ['order', 'manual', 'adjustment'], default: 'manual' },
    admin:     { type: Schema.Types.ObjectId, ref: 'User' },
    order:     { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);
stockMovementSchema.index({ inventory: 1, createdAt: -1 });

// ── Refund ────────────────────────────────────────────────────────────────────
const refundSchema = new Schema(
  {
    order:     { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user:      { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    amount:    { type: Number, required: true, min: 0 },
    reason:    { type: String, required: true, trim: true, maxlength: 500 },
    status:    { type: String, enum: ['pending', 'approved', 'rejected', 'processed'], default: 'pending' },
    adminNote: { type: String, trim: true },
    razorpayRefundId: String,
    processedAt: Date,
  },
  { timestamps: true },
);
refundSchema.index({ order: 1 }, { unique: true });
refundSchema.index({ user: 1, createdAt: -1 });

// ── Delivery Zone ─────────────────────────────────────────────────────────────
const deliveryZoneSchema = new Schema(
  {
    name:      { type: String, required: true, trim: true },
    pincodes:  [{ type: String, trim: true }],  // list of 6-digit pincodes
    fee:       { type: Number, required: true, min: 0, default: 0 },
    minOrder:  { type: Number, default: 0 },
    active:    { type: Boolean, default: true },
    etaMin:    { type: Number, default: 30 },   // estimated minutes
  },
  { timestamps: true },
);

// ── Push Subscription ─────────────────────────────────────────────────────────
const pushSubSchema = new Schema(
  {
    user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint:     { type: String, required: true },
    keys:         { p256dh: String, auth: String },
    preferences:  {
      orderUpdates:  { type: Boolean, default: true },
      promotions:    { type: Boolean, default: false },
      lowStock:      { type: Boolean, default: false }, // admin only
    },
  },
  { timestamps: true },
);
pushSubSchema.index({ user: 1 });
pushSubSchema.index({ endpoint: 1 }, { unique: true });

// ── Admin Activity Log ────────────────────────────────────────────────────────
const activityLogSchema = new Schema(
  {
    admin:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:   { type: String, required: true }, // e.g. 'ORDER_STATUS_UPDATE'
    target:   { type: String },                 // e.g. orderId, userId
    details:  { type: Schema.Types.Mixed },
    ip:       String,
  },
  { timestamps: true },
);
activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// ── Referral ──────────────────────────────────────────────────────────────────
const referralSchema = new Schema(
  {
    referrer:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referred:  { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code:      { type: String, required: true },
    rewarded:  { type: Boolean, default: false },   // true once referred places first order
    rewardedAt: Date,
  },
  { timestamps: true },
);
referralSchema.index({ referrer: 1 });
referralSchema.index({ code: 1 });

export const StockMovement = model('StockMovement', stockMovementSchema);
export const Refund        = model('Refund',        refundSchema);
export const DeliveryZone  = model('DeliveryZone',  deliveryZoneSchema);
export const PushSub       = model('PushSub',       pushSubSchema);
export const ActivityLog   = model('ActivityLog',   activityLogSchema);
export const Referral      = model('Referral',      referralSchema);

