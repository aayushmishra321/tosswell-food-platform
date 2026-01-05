/**
 * RAG Knowledge Base Ingestion
 * Run: node src/rag-ingest.js
 * Re-run any time menu or policies change.
 */
import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { Pizza, Inventory } from './models.js';

const QDRANT_URL       = process.env.QDRANT_URL        || 'http://localhost:6333';
const COLLECTION       = process.env.QDRANT_COLLECTION || 'tosswell_knowledge';
const EMBEDDING_MODEL  = 'text-embedding-004';
const VECTOR_SIZE      = 768; // text-embedding-004 output size

const qdrant = new QdrantClient({ url: QDRANT_URL });
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embed(text) {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

await mongoose.connect(process.env.MONGO_URI);

// ── 1. Build documents from live DB + static policies ────────────────────────
const [pizzas, inventory] = await Promise.all([
  Pizza.find({ available: true }).lean(),
  Inventory.find().lean(),
]);

const documents = [];

// Pizza menu documents
for (const p of pizzas) {
  documents.push({
    id:      `pizza-${p._id}`,
    title:   `Pizza: ${p.name}`,
    content: `${p.name} — ₹${p.price}. ${p.description || ''}
Ingredients: Base: ${p.base}, Sauce: ${p.sauce}, Cheese: ${p.cheese}, Vegetables: ${(p.veggies || []).join(', ') || 'none'}.
Vegetarian: ${p.isVeg ? 'Yes' : 'No'}. Spice level: ${p.spiceLevel || 'Medium'}.
Allergens: Contains gluten (wheat base). Contains dairy (cheese). ${p.veggies.includes('Paneer') ? 'Contains paneer (dairy).' : ''}`,
  });
}

// Inventory / ingredients document
const byCategory = {};
for (const item of inventory) {
  if (!byCategory[item.category]) byCategory[item.category] = [];
  byCategory[item.category].push(`${item.name} (+₹${item.price})`);
}
documents.push({
  id:      'ingredients-overview',
  title:   'Available Ingredients',
  content: `Tosswell Pizza offers the following ingredients for custom pizzas:
Bases (${byCategory.base?.join(', ')}).
Sauces (${byCategory.sauce?.join(', ')}).
Cheeses (${byCategory.cheese?.join(', ')}).
Vegetables (${byCategory.veggie?.join(', ')}).
All pizzas are vegetarian unless otherwise specified.`,
});

// Static policy documents
const STATIC_DOCS = [
  {
    id: 'delivery-policy',
    title: 'Delivery Policy',
    content: `Tosswell Pizza delivers within 45 minutes on average.
Delivery is available for addresses with a valid 6-digit Indian pincode.
Delivery fee is calculated based on delivery zone and shown at checkout.
We currently deliver within our configured delivery zones only.
Minimum order amount may apply depending on the delivery zone.
Scheduled orders can be placed up to 24 hours in advance.`,
  },
  {
    id: 'cancellation-policy',
    title: 'Cancellation & Refund Policy',
    content: `Orders can be cancelled before they enter 'Preparing' status.
Once the pizza is being prepared, cancellation is not possible.
Refunds for cancelled or failed orders are processed within 5-7 business days to the original payment method.
To request a refund, go to My Orders and click 'Request Refund' on the eligible order.
Refund requests are reviewed by our team within 24 hours.`,
  },
  {
    id: 'payment-faq',
    title: 'Payment FAQ',
    content: `We accept all major payment methods through Razorpay including:
Credit cards, debit cards (Visa, Mastercard, RuPay), UPI (GPay, PhonePe, Paytm), Net banking, and digital wallets.
All payments are processed securely. We do not store card details.
Payment failures are automatically refunded within 3-5 business days.`,
  },
  {
    id: 'loyalty-program',
    title: 'Loyalty Rewards Program',
    content: `Tosswell Pizza offers a free loyalty program.
Earn 1 point for every ₹10 spent on eligible orders.
Points can be redeemed at checkout — 1 point = ₹0.50 discount.
Tiers: Bronze (0-499 pts), Silver (500-1499 pts), Gold (1500+ pts).
Higher tiers unlock exclusive offers and priority delivery.
Points are credited after successful order delivery.`,
  },
  {
    id: 'coupon-policy',
    title: 'Coupon & Discount Policy',
    content: `Tosswell Pizza offers promotional coupon codes.
Coupons can be percentage or fixed discounts.
Each coupon has a minimum order requirement and may have a maximum discount cap.
Coupons have expiry dates and usage limits.
Only one coupon can be applied per order.
Coupon cannot be combined with loyalty point redemptions beyond the single-order limit.`,
  },
  {
    id: 'contact-info',
    title: 'Contact Information',
    content: `Tosswell Pizza contact details:
Email: tosswellpizza@gmail.com
Support hours: 10 AM – 10 PM daily.
For urgent order issues, use the in-app chat or email us directly.
Admin dashboard: /admin/login (staff only).`,
  },
  {
    id: 'allergen-info',
    title: 'Allergen Information',
    content: `Common allergens in Tosswell Pizza products:
GLUTEN: All pizza bases contain wheat flour. Not suitable for people with celiac disease.
DAIRY: All cheeses contain milk. Mozzarella, Cheddar, Parmesan, and Vegan Cheese are available.
Vegan Cheese is dairy-free and suitable for vegans.
NUTS: Our kitchen does not use nuts, but cross-contamination cannot be guaranteed.
All Tosswell pizzas are 100% vegetarian — we do not use any meat or eggs in our products.
Paneer contains milk protein.
If you have severe allergies, please contact us before ordering.`,
  },
];

for (const doc of STATIC_DOCS) documents.push(doc);

// ── 2. Ensure Qdrant collection exists ────────────────────────────────────────
const existing = await qdrant.getCollections();
const exists = existing.collections.some((c) => c.name === COLLECTION);

if (!exists) {
  await qdrant.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  });
  console.log(`Created collection: ${COLLECTION}`);
} else {
  console.log(`Collection exists: ${COLLECTION}`);
}

// ── 3. Embed and upsert all documents ─────────────────────────────────────────
console.log(`\nIndexing ${documents.length} documents...`);
let done = 0;

for (const doc of documents) {
  const vector = await embed(doc.content);
  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [{
      id:      doc.id,
      vector,
      payload: { title: doc.title, content: doc.content },
    }],
  });
  done++;
  process.stdout.write(`\r  ${done}/${documents.length}`);
  // Small delay to avoid Gemini rate limits
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\n\n✓ Indexed ${done} documents into "${COLLECTION}"`);
await mongoose.disconnect();
