/**
 * Seed high-quality pizza images from Unsplash (free CDN, no auth).
 * Run once:         node src/seed-images.js
 * Force re-seed:    node src/seed-images.js --force
 * Safe to re-run without --force — only updates pizzas that have no image set.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Pizza } from './models.js';

const force = process.argv.includes('--force');

// Curated Unsplash pizza photos — each URL returns the image directly.
const IMAGE_MAP = {
  'Margherita': {
    url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&q=80&fit=crop',
    alt: 'Classic Margherita pizza with fresh basil and mozzarella',
  },
  'Farmhouse': {
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&q=80&fit=crop',
    alt: 'Farmhouse pizza loaded with vegetables',
  },
  'Peri-Peri Paneer': {
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&q=80&fit=crop',
    alt: 'Spicy peri-peri paneer pizza',
  },
  'Garden Pesto': {
    url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&q=80&fit=crop',
    alt: 'Garden pesto pizza with olives and parmesan',
  },
  'Smoky Corn Barbecue': {
    url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&q=80&fit=crop',
    alt: 'Smoky barbecue pizza with corn and capsicum',
  },
  'Burst Supreme': {
    url: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&q=80&fit=crop',
    alt: 'Supreme cheese burst pizza loaded with toppings',
  },
};

// Generic fallback for any pizza not in the map
const FALLBACK = {
  url: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=800&q=80&fit=crop',
  thumb: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=400&h=300&q=80&fit=crop',
  alt: 'Fresh pizza',
};

await mongoose.connect(process.env.MONGO_URI);

const pizzas = await Pizza.find().lean();
let updated = 0;
let skipped = 0;

for (const pizza of pizzas) {
  if (pizza.image?.url && !force) {
    console.log(`  skipped (already has image): ${pizza.name}`);
    skipped++;
    continue;
  }
  const img = IMAGE_MAP[pizza.name] || FALLBACK;
  await Pizza.updateOne({ _id: pizza._id }, { image: { ...img, publicId: null } });
  console.log(`  seeded${force && pizza.image?.url ? ' (forced)' : ''}: ${pizza.name}`);
  updated++;
}

console.log(`\nDone — seeded images for ${updated} pizza(s), skipped ${skipped}.`);
if (!force && skipped > 0) console.log('Run with --force to overwrite existing images.');
await mongoose.disconnect();
