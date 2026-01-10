import cron from 'node-cron';
import { Inventory } from '../models.js';
import { sendMail } from '../mailer.js';

// Emails the admin once per dip below an item's threshold; re-arms when stock recovers
export async function checkLowStock() {
  await Inventory.updateMany({ lowStockAlerted: true, $expr: { $gte: ['$stock', '$threshold'] } }, { lowStockAlerted: false });
  const low = await Inventory.find({ lowStockAlerted: false, $expr: { $lt: ['$stock', '$threshold'] } }).lean();
  if (!low.length) return;
  await sendMail({
    to: process.env.ADMIN_EMAIL,
    subject: `Low stock: ${low.length} item${low.length > 1 ? 's' : ''} need restocking`,
    text: low.map((i) => `${i.name} (${i.category}): ${i.stock} left, threshold ${i.threshold}`).join('\n'),
  });
  await Inventory.updateMany({ _id: { $in: low.map((i) => i._id) } }, { lowStockAlerted: true });
}

export const startStockJob = () =>
  cron.schedule(process.env.STOCK_CRON || '*/15 * * * *', () => checkLowStock().catch((e) => console.error('stock check failed:', e.message)));
