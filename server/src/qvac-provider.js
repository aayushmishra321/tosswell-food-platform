/**
 * QVAC Local AI Provider
 *
 * Loads the Llama 3.2 1B model once at startup and keeps it warm for reuse.
 * Only active when AI_PROVIDER=qvac in .env.
 *
 * IMPORTANT CONSTRAINTS (enforced here, not by the model):
 *   - The LLM never calculates prices, modifies stock, confirms payments,
 *     or bypasses auth. It only generates natural-language text.
 *   - All business operations remain in their respective route handlers.
 */

// Dynamic import — @qvac/sdk lives in qvac-test/node_modules, not server/node_modules.
// We locate it at runtime using the path from env or a sensible default.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the qvac-test folder (sibling of server/)
const QVAC_DIR = process.env.QVAC_DIR ||
  path.resolve(__dirname, '../../qvac-test'); // server/src/../../qvac-test

const QVAC_SDK_PATH = path.join(QVAC_DIR, 'node_modules', '@qvac', 'sdk', 'dist', 'src', 'index.js');

let sdk = null;           // the loaded SDK module
let loadedModelId = null; // kept alive between requests
let loading = false;      // prevent concurrent loads
let loadError = null;     // cached startup error

/** System prompt injected before every conversation */
const SYSTEM_PROMPT = `You are Tossy, a friendly and helpful pizza assistant for Tosswell Pizza.
Help customers choose pizzas, explain ingredients, make recommendations, and answer menu questions.
Keep responses concise, warm and accurate. Prices are in Indian Rupees (₹).
You CANNOT place orders, modify prices, change stock, or process payments — direct customers to the checkout for those actions.`;

/** Load the SDK module dynamically from qvac-test/node_modules */
async function loadSDK() {
  if (sdk) return sdk;
  try {
    // Use pathToFileURL for Windows compatibility
    const { pathToFileURL } = await import('node:url');
    sdk = await import(pathToFileURL(QVAC_SDK_PATH).href);
    console.log('[QVAC] SDK loaded from', QVAC_SDK_PATH);
    return sdk;
  } catch (err) {
    throw new Error(`[QVAC] Cannot load SDK from ${QVAC_SDK_PATH}: ${err.message}`);
  }
}

/** Start the QVAC provider — loads model once, keeps it in memory */
export async function startQvac() {
  if (loading) return;
  loading = true;
  try {
    const s = await loadSDK();
    const modelConst = s.LLAMA_3_2_1B_INST_Q4_0;
    if (!modelConst) throw new Error('[QVAC] LLAMA_3_2_1B_INST_Q4_0 constant not found in SDK');

    console.log('[QVAC] Loading model (uses cache after first download)...');
    const start = Date.now();
    let lastPct = -1;

    loadedModelId = await s.loadModel({
      modelSrc: modelConst,
      onProgress: (p) => {
        if (p.downloadedBytes != null && p.totalBytes != null) {
          const pct = Math.floor((p.downloadedBytes / p.totalBytes) * 100);
          if (pct !== lastPct && pct % 10 === 0) {
            const mb = (p.downloadedBytes / 1024 / 1024).toFixed(0);
            process.stdout.write(`\r[QVAC] Downloading: ${mb} MB (${pct}%)   `);
            lastPct = pct;
          }
        }
      },
    });

    console.log(`\n[QVAC] Model ready in ${((Date.now() - start) / 1000).toFixed(1)}s — modelId: ${loadedModelId}`);
    loadError = null;
  } catch (err) {
    loadError = err;
    console.error('[QVAC] Failed to start:', err.message);
  } finally {
    loading = false;
  }
}

/** Run a single-turn or multi-turn chat completion */
export async function qvacChat(messages) {
  if (loadError) throw new Error(`QVAC provider failed to start: ${loadError.message}`);
  if (!loadedModelId) throw new Error('QVAC model is not loaded yet');

  const s = await loadSDK();

  // Prepend system message if not already present
  const history = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  let text = '';
  const run = s.completion({ modelId: loadedModelId, history, stream: true });
  for await (const token of run.tokenStream) {
    text += token;
  }
  return text.trim();
}

/** Check whether the provider is ready */
export function isQvacReady() {
  return !!loadedModelId && !loadError;
}

/** Clean shutdown — call when the server exits */
export async function stopQvac() {
  if (!loadedModelId) return;
  try {
    const s = await loadSDK();
    await s.unloadModel({ modelId: loadedModelId });
    await s.close();
    loadedModelId = null;
    console.log('[QVAC] Model unloaded and SDK closed.');
  } catch (err) {
    console.warn('[QVAC] Shutdown error:', err.message);
  }
}
