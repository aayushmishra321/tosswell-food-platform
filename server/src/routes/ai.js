import { Router } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pizza, Inventory, Review, Order } from '../models.js';
import { auth, httpError } from '../middleware.js';

const r = Router();
// Note: NO global auth middleware here — each route declares its own auth
// (user routes need 'user', admin routes need 'admin')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Primary model from env, with a fallback chain if overloaded/unavailable
const PRIMARY_MODEL  = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];

// Wrapper: try primary, then each fallback, surface a clean error if all fail
async function withFallback(fn) {
  const chain = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastErr;
  for (const model of chain) {
    try {
      return await fn(model);
    } catch (err) {
      const msg = err.message || '';
      // Only retry on overload or model-not-found errors
      const retryable = msg.includes('high demand') || msg.includes('503') ||
                        msg.includes('no longer available') || msg.includes('not found') ||
                        msg.includes('404');
      if (!retryable) throw err; // hard error — don't retry
      lastErr = err;
      console.warn(`[AI] model ${model} unavailable, trying next. (${msg.slice(0,80)})`);
    }
  }
  throw lastErr;
}

// ── Tool definitions (Gemini function calling) ───────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'getMenu',
        description: 'Get the full pizza menu and available inventory options. Call this before making recommendations.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'searchPizzas',
        description: 'Search pizzas by budget, spice level, dietary preference, or ingredients.',
        parameters: {
          type: 'OBJECT',
          properties: {
            maxPrice: { type: 'NUMBER', description: 'Maximum price in INR' },
            ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Ingredients to include' },
            excludeIngredients: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Ingredients to avoid' },
          },
          required: [],
        },
      },
      {
        name: 'suggestCustomPizza',
        description: 'Generate a custom pizza configuration based on user preferences. Returns a valid ingredient combination from live inventory.',
        parameters: {
          type: 'OBJECT',
          properties: {
            preference: { type: 'STRING', description: 'Natural language description of what the customer wants' },
          },
          required: ['preference'],
        },
      },
    ],
  },
];

// ── Tool execution ─────────────────────────────────────────────────────────
async function runTool(name, args) {
  if (name === 'getMenu') {
    const [pizzas, inv] = await Promise.all([
      Pizza.find({ available: true }).lean(),
      Inventory.find().lean(),
    ]);
    const options = { base: [], sauce: [], cheese: [], veggie: [] };
    for (const i of inv) options[i.category].push({ name: i.name, price: i.price, inStock: i.stock > 0 });
    return { pizzas: pizzas.map((p) => ({ id: p._id, name: p.name, description: p.description, price: p.price, base: p.base, sauce: p.sauce, cheese: p.cheese, veggies: p.veggies, image: p.image || null })), options };
  }

  if (name === 'searchPizzas') {
    const filter = { available: true };
    if (args.maxPrice) filter.price = { $lte: args.maxPrice };
    let pizzas = await Pizza.find(filter).lean();
    if (args.ingredients?.length) {
      pizzas = pizzas.filter((p) =>
        args.ingredients.some((ing) =>
          [p.base, p.sauce, p.cheese, ...p.veggies].some((i) => i?.toLowerCase().includes(ing.toLowerCase())),
        ),
      );
    }
    if (args.excludeIngredients?.length) {
      pizzas = pizzas.filter((p) =>
        !args.excludeIngredients.some((exc) =>
          [p.base, p.sauce, p.cheese, ...p.veggies].some((i) => i?.toLowerCase().includes(exc.toLowerCase())),
        ),
      );
    }
    // Check availability
    const inv = await Inventory.find().lean();
    const inStock = (cat, name) => inv.find((i) => i.category === cat && i.name === name)?.stock > 0;
    const available = pizzas.filter((p) =>
      inStock('base', p.base) && inStock('sauce', p.sauce) && inStock('cheese', p.cheese) &&
      p.veggies.every((v) => inStock('veggie', v)),
    );
    return available.map((p) => ({ id: p._id, name: p.name, description: p.description, price: p.price, base: p.base, sauce: p.sauce, cheese: p.cheese, veggies: p.veggies, image: p.image || null }));
  }

  if (name === 'suggestCustomPizza') {
    const inv = await Inventory.find({ stock: { $gt: 0 } }).lean();
    const opts = { base: [], sauce: [], cheese: [], veggie: [] };
    for (const i of inv) opts[i.category].push({ name: i.name, price: i.price });

    // Ask Gemini to pick from available options — use fallback chain
    const pickPrompt = `You are a pizza chef. Based on this customer preference: "${args.preference}"
    
Pick exactly one of each from these available ingredients:
Bases: ${opts.base.map((b) => b.name).join(', ')}
Sauces: ${opts.sauce.map((s) => s.name).join(', ')}
Cheeses: ${opts.cheese.map((c) => c.name).join(', ')}
Vegetables (pick 0-4): ${opts.veggie.map((v) => v.name).join(', ')}

Respond with ONLY valid JSON in this exact format, no markdown:
{"base":"<name>","sauce":"<name>","cheese":"<name>","veggies":["<name>"],"reason":"<one sentence why>"}`;

    const result = await withFallback((model) =>
      genAI.getGenerativeModel({ model }).generateContent(pickPrompt)
    );
    const raw = result.response.text().trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    try {
      const config = JSON.parse(raw);
      // Calculate price from live inventory
      const price =
        (opts.base.find((b) => b.name === config.base)?.price || 0) +
        (opts.sauce.find((s) => s.name === config.sauce)?.price || 0) +
        (opts.cheese.find((c) => c.name === config.cheese)?.price || 0) +
        config.veggies.reduce((s, v) => s + (opts.veggie.find((x) => x.name === v)?.price || 0), 0);
      return { ...config, price };
    } catch {
      return { error: 'Could not generate a custom pizza. Please try again with different preferences.' };
    }
  }

  return { error: 'Unknown tool' };
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
r.post('/chat', auth('user'), async (req, res) => {
  const { history, message } = z.object({
    history: z.array(z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(z.object({ text: z.string() })),
    })).max(20),
    message: z.string().trim().min(1).max(500),
  }).parse(req.body);

  const systemInstruction = `You are Tossy, a friendly and helpful pizza assistant for Tosswell Pizza.
Your job is to help customers find the perfect pizza from our menu.

Rules:
- Always call getMenu or searchPizzas before making recommendations to ensure real-time accuracy.
- Never invent pizza names, prices, or ingredients. Only recommend what the tools return.
- When recommending a pizza, always mention: name, price, and why it matches the customer's request.
- If a pizza is unavailable, say so and suggest an alternative.
- Keep responses concise, warm, and helpful.
- You cannot add items to cart directly — tell the customer to click "Add to Cart" on the pizza card.
- Do not discuss non-food topics.
- Prices are in Indian Rupees (₹).`;

  let result = await withFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName, tools, systemInstruction });
    const chat  = model.startChat({ history });
    let r = await chat.sendMessage(message);
    let response = r.response;

    // Handle function calls in a loop
    while (response.functionCalls()?.length) {
      const calls = response.functionCalls();
      const toolResults = await Promise.all(
        calls.map(async (call) => ({
          functionResponse: { name: call.name, response: await runTool(call.name, call.args) },
        })),
      );
      r = await chat.sendMessage(toolResults);
      response = r.response;
    }
    return response.text();
  });

  res.json({ reply: result });
});

// ── POST /api/ai/suggest-pizza ────────────────────────────────────────────────
r.post('/suggest-pizza', auth('user'), async (req, res) => {
  const { preference } = z.object({ preference: z.string().trim().min(3).max(300) }).parse(req.body);
  const config = await runTool('suggestCustomPizza', { preference });
  if (config.error) throw httpError(400, config.error);
  res.json(config);
});

// ── POST /api/ai/sentiment — classify a single review (admin) ─────────────────
r.post('/sentiment', auth('admin'), async (req, res) => {
  const { reviewId } = z.object({ reviewId: z.string().min(1) }).parse(req.body);

  const review = await Review.findById(reviewId).lean();
  if (!review) throw httpError(404, 'Review not found');
  if (!review.comment) {
    await Review.findByIdAndUpdate(reviewId, { sentiment: 'Neutral' });
    return res.json({ sentiment: 'Neutral' });
  }

  const prompt = `Classify the following pizza restaurant review as exactly one of: Positive, Neutral, or Negative.
Reply with ONLY the single word — no explanation.

Review: "${review.comment}"`;

  const sentiment = await withFallback(async (model) => {
    const m = genAI.getGenerativeModel({ model });
    const r = await m.generateContent(prompt);
    const text = r.response.text().trim();
    if (['Positive', 'Neutral', 'Negative'].includes(text)) return text;
    // Fallback mapping if model added extra words
    if (text.toLowerCase().includes('positive')) return 'Positive';
    if (text.toLowerCase().includes('negative')) return 'Negative';
    return 'Neutral';
  });

  await Review.findByIdAndUpdate(reviewId, { sentiment });
  res.json({ sentiment });
});

// ── POST /api/ai/sentiment/batch — classify all unclassified reviews ──────────
r.post('/sentiment/batch', auth('admin'), async (req, res) => {
  const unclassified = await Review.find({
    comment:   { $exists: true, $ne: '' },
    sentiment: { $exists: false },
  }).lean();

  if (!unclassified.length) return res.json({ processed: 0 });

  let processed = 0;
  for (const review of unclassified) {
    try {
      const prompt = `Classify this review as Positive, Neutral, or Negative. Reply with ONLY that word.\nReview: "${review.comment}"`;
      const sentiment = await withFallback(async (model) => {
        const m = genAI.getGenerativeModel({ model });
        const r = await m.generateContent(prompt);
        const t = r.response.text().trim();
        if (['Positive', 'Neutral', 'Negative'].includes(t)) return t;
        if (t.toLowerCase().includes('positive')) return 'Positive';
        if (t.toLowerCase().includes('negative')) return 'Negative';
        return 'Neutral';
      });
      await Review.findByIdAndUpdate(review._id, { sentiment });
      processed++;
      await new Promise((resolve) => setTimeout(resolve, 200)); // rate limit
    } catch { /* skip on error */ }
  }
  res.json({ processed });
});

// ── GET /api/ai/forecast — inventory demand forecast (admin) ──────────────────
r.get('/forecast', auth('admin'), async (req, res) => {
  const days = Math.min(30, Math.max(7, Number(req.query.days) || 14));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Aggregate ingredient consumption from paid orders
  const paidStatuses = ['Order Placed', 'Payment Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  const orders = await Order.find({ status: { $in: paidStatuses }, createdAt: { $gte: since } }).lean();

  if (orders.length < 3) {
    return res.json({
      insufficient: true,
      message: `Need at least 3 orders in the last ${days} days to generate a forecast. Currently have ${orders.length}.`,
      orders: orders.length,
      daysAnalysed: days,
    });
  }

  // Count ingredient usage
  const usage = {}; // "category|name" -> total quantity
  for (const order of orders) {
    for (const item of order.items) {
      const parts = [
        ['base', item.base], ['sauce', item.sauce], ['cheese', item.cheese],
        ...(item.veggies || []).map((v) => ['veggie', v]),
      ];
      for (const [cat, name] of parts) {
        if (!name) continue;
        const k = `${cat}|${name}`;
        usage[k] = (usage[k] || 0) + (item.qty || 1);
      }
    }
  }

  const inventory = await Inventory.find().lean();
  const dailyRate = days;

  const forecasts = inventory.map((item) => {
    const k = `${item.category}|${item.name}`;
    const totalUsed = usage[k] || 0;
    const avgPerDay = totalUsed / dailyRate;
    const daysUntilStockout = avgPerDay > 0 ? Math.floor(item.stock / avgPerDay) : null;
    const suggestedRestock = Math.max(0, Math.ceil(avgPerDay * 7) - item.stock); // 1 week buffer

    return {
      _id:              item._id,
      category:         item.category,
      name:             item.name,
      currentStock:     item.stock,
      threshold:        item.threshold,
      totalUsed,
      avgPerDay:        Math.round(avgPerDay * 10) / 10,
      daysUntilStockout,
      suggestedRestock,
      status:           item.stock === 0 ? 'out' :
                        item.stock < item.threshold ? 'low' :
                        daysUntilStockout !== null && daysUntilStockout <= 7 ? 'warning' : 'ok',
    };
  });

  // Sort by urgency
  forecasts.sort((a, b) => {
    const urgency = { out: 0, low: 1, warning: 2, ok: 3 };
    return (urgency[a.status] ?? 3) - (urgency[b.status] ?? 3);
  });

  res.json({
    insufficient: false,
    daysAnalysed: days,
    ordersAnalysed: orders.length,
    forecasts,
    generatedAt: new Date(),
  });
});

// ── GET /api/ai/insights — AI summary for admin dashboard ─────────────────────
r.get('/insights', auth('admin'), async (req, res) => {
  // Gather real data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const paidStatuses  = ['Order Placed', 'Payment Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

  const [recentOrders, lowStock, recentReviews, sentimentCounts] = await Promise.all([
    Order.find({ status: { $in: paidStatuses }, createdAt: { $gte: thirtyDaysAgo } })
      .select('total items status createdAt').lean(),
    Inventory.find({ $expr: { $lt: ['$stock', '$threshold'] } }).lean(),
    Review.find({ createdAt: { $gte: thirtyDaysAgo }, comment: { $exists: true, $ne: '' } })
      .select('rating comment sentiment').lean(),
    Review.aggregate([
      { $match: { sentiment: { $exists: true }, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]),
  ]);

  const totalRevenue   = recentOrders.reduce((s, o) => s + o.total, 0);
  const avgRating      = recentReviews.length
    ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)
    : 'N/A';
  const sentimentMap   = Object.fromEntries(sentimentCounts.map((s) => [s._id, s.count]));

  const prompt = `You are a restaurant business analyst for Tosswell Pizza.
Based on the following data from the last 30 days, provide 3–5 specific, actionable business insights.
Be concise — each insight in 1–2 sentences. Format as a numbered list.

Data:
- Total orders: ${recentOrders.length}
- Total revenue: ₹${totalRevenue}
- Average customer rating: ${avgRating}/5
- Sentiment: ${sentimentMap.Positive || 0} positive, ${sentimentMap.Neutral || 0} neutral, ${sentimentMap.Negative || 0} negative reviews
- Low stock items: ${lowStock.map((i) => i.name).join(', ') || 'none'}
- Order status breakdown: ${JSON.stringify(recentOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {}))}

Provide actionable insights for the restaurant manager:`;

  let insights;
  try {
    insights = await withFallback(async (model) => {
      const m = genAI.getGenerativeModel({ model });
      const r = await m.generateContent(prompt);
      return r.response.text();
    });
  } catch {
    insights = 'AI insights are temporarily unavailable. Please try again later.';
  }

  res.json({
    insights,
    data: {
      totalOrders:  recentOrders.length,
      totalRevenue,
      avgRating,
      sentiment:    sentimentMap,
      lowStockCount: lowStock.length,
    },
    generatedAt: new Date(),
  });
});

export default r;

