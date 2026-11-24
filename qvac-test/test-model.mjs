/**
 * Phase 1: Download and test QVAC LLAMA_3_2_1B_INST_Q4_0
 * Run from qvac-test/: node test-model.mjs
 */
import {
  loadModel,
  unloadModel,
  completion,
  LLAMA_3_2_1B_INST_Q4_0,
  close,
} from '@qvac/sdk';

const PIZZA_SYSTEM = `You are Tossy, a helpful pizza ordering assistant for Tosswell Pizza.
You help customers choose pizzas, answer menu questions, and explain ingredients.
Keep answers concise and friendly. Prices are in Indian Rupees (₹).
Available pizzas: Margherita (₹249), Farmhouse (₹329), Peri-Peri Paneer (₹349), Garden Pesto (₹369), Smoky Corn Barbecue (₹339), Burst Supreme (₹429).
All pizzas are vegetarian.`;

const TESTS = [
  'Recommend a vegetarian pizza under ₹300.',
  'Suggest a spicy paneer pizza.',
  'What is the difference between Margherita and Farmhouse pizza?',
];

console.log('=== QVAC Model Test — Tosswell Pizza ===\n');
console.log('Model: LLAMA_3_2_1B_INST_Q4_0');
console.log('Source:', LLAMA_3_2_1B_INST_Q4_0.src, '\n');

let modelId;

try {
  // ── Load (downloads on first run, uses cache after) ───────────────────────
  console.log('Loading model (downloads on first run, ~700 MB)...\n');
  const loadStart = Date.now();
  let lastPct = -1;

  modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      // progress shape: { type, totalBytes, downloadedBytes, ... }
      if (progress.downloadedBytes != null && progress.totalBytes != null) {
        const pct = Math.floor((progress.downloadedBytes / progress.totalBytes) * 100);
        if (pct !== lastPct && pct % 5 === 0) {
          const mb = (progress.downloadedBytes / 1024 / 1024).toFixed(1);
          const total = (progress.totalBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r  Downloading: ${mb} MB / ${total} MB  (${pct}%)   `);
          lastPct = pct;
        }
      } else if (progress.type) {
        console.log(`\n  [${progress.type}]`);
      }
    },
  });

  const loadMs = Date.now() - loadStart;
  console.log(`\n\n✓ Model loaded in ${(loadMs / 1000).toFixed(1)}s  (modelId: ${modelId})\n`);

  // ── Run test prompts ───────────────────────────────────────────────────────
  for (let i = 0; i < TESTS.length; i++) {
    const question = TESTS[i];
    console.log(`─── Test ${i + 1}: "${question}"`);

    const history = [
      { role: 'system', content: PIZZA_SYSTEM },
      { role: 'user',   content: question },
    ];

    const inferStart = Date.now();
    let responseText = '';

    const run = completion({ modelId, history, stream: true });

    for await (const token of run.tokenStream) {
      process.stdout.write(token);
      responseText += token;
    }

    const inferMs = Date.now() - inferStart;
    console.log(`\n  [${(inferMs / 1000).toFixed(1)}s, ${responseText.length} chars]\n`);
  }

  console.log('✓ All tests passed — QVAC local inference working.\n');

} catch (err) {
  console.error('\n✗ Error:', err.message || err);
  process.exit(1);
} finally {
  if (modelId) {
    await unloadModel({ modelId });
    console.log('Model unloaded.');
  }
  await close();
  console.log('SDK closed.');
}
