/**
 * RAG Customer Support Bot
 * Uses Qdrant (local Docker) for vector storage + Gemini for embeddings & answers.
 * Gracefully returns a fallback message when Qdrant is unavailable.
 */
import { Router } from 'express';
import { z } from 'zod';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { httpError } from '../middleware.js';

const r = Router();

const QDRANT_URL        = process.env.QDRANT_URL        || 'http://localhost:6333';
const COLLECTION        = process.env.QDRANT_COLLECTION || 'tosswell_knowledge';
const EMBEDDING_MODEL   = 'text-embedding-004'; // Google's current stable embedding model
const GENERATION_MODEL  = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS   = ['gemini-2.5-flash', 'gemini-3.5-flash'];

let qdrant = null;
let qdrantReady = false;

// Lazy-init Qdrant — does NOT crash the server if Qdrant is down
async function getQdrant() {
  if (qdrantReady) return qdrant;
  try {
    qdrant = new QdrantClient({ url: QDRANT_URL });
    await qdrant.getCollections(); // ping
    qdrantReady = true;
    console.log('[RAG] Qdrant connected at', QDRANT_URL);
  } catch {
    qdrant = null;
    qdrantReady = false;
    console.warn('[RAG] Qdrant unavailable — RAG features disabled.');
  }
  return qdrant;
}

// Probe Qdrant on startup (non-blocking)
getQdrant().catch(() => {});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embed(text) {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function generate(prompt) {
  const chain = [GENERATION_MODEL, ...FALLBACK_MODELS];
  for (const model of chain) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const r = await m.generateContent(prompt);
      return r.response.text();
    } catch (e) {
      const retryable = (e.message || '').includes('high demand') ||
                        (e.message || '').includes('no longer available') ||
                        (e.message || '').includes('404');
      if (!retryable) throw e;
    }
  }
  throw new Error('All Gemini models unavailable');
}

// ── GET /api/rag/status ───────────────────────────────────────────────────────
r.get('/status', async (_req, res) => {
  const client = await getQdrant();
  if (!client) return res.json({ available: false, reason: 'Qdrant not reachable' });
  try {
    const collections = await client.getCollections();
    const indexed = collections.collections.some((c) => c.name === COLLECTION);
    res.json({ available: true, indexed, collection: COLLECTION });
  } catch {
    res.json({ available: false, reason: 'Qdrant error' });
  }
});

// ── POST /api/rag/ask — public support chat ───────────────────────────────────
r.post('/ask', async (req, res) => {
  const { question } = z.object({
    question: z.string().trim().min(2).max(500),
  }).parse(req.body);

  const client = await getQdrant();
  if (!client) {
    return res.json({
      answer: "I'm sorry, the support system is currently unavailable. Please email us at tosswellpizza@gmail.com for assistance.",
      sources: [],
      ragUsed: false,
    });
  }

  // Check collection exists
  const collections = await client.getCollections();
  const indexed = collections.collections.some((c) => c.name === COLLECTION);
  if (!indexed) {
    return res.json({
      answer: "The knowledge base hasn't been indexed yet. Please ask an admin to run the indexing process.",
      sources: [],
      ragUsed: false,
    });
  }

  // Embed the question
  let questionVector;
  try {
    questionVector = await embed(question);
  } catch (e) {
    return res.json({
      answer: "I'm having trouble processing your question right now. Please try again shortly.",
      sources: [],
      ragUsed: false,
    });
  }

  // Retrieve top-5 relevant documents
  const results = await client.search(COLLECTION, {
    vector: questionVector,
    limit: 5,
    with_payload: true,
    score_threshold: 0.6,
  });

  if (!results.length) {
    return res.json({
      answer: "I don't have specific information about that. Please contact us at tosswellpizza@gmail.com.",
      sources: [],
      ragUsed: true,
    });
  }

  const context = results.map((r, i) => `[${i + 1}] ${r.payload.content}`).join('\n\n');
  const sources = results.map((r) => r.payload.title).filter(Boolean);

  const prompt = `You are a helpful customer support assistant for Tosswell Pizza.
Answer the customer's question using ONLY the information provided below.
Do NOT invent information, prices, or policies that are not in the context.
If the answer is not in the context, say so clearly.

Context:
${context}

Customer question: ${question}

Answer concisely and helpfully:`;

  const answer = await generate(prompt);

  res.json({ answer, sources: [...new Set(sources)], ragUsed: true });
});

export default r;
export { getQdrant, embed, COLLECTION };
