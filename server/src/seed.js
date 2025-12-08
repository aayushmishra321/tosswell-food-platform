import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Inventory, Pizza, User } from './models.js';

const stockList = {
  base:   [['Thin Crust', 90], ['Hand Tossed', 100], ['Whole Wheat', 110], ['Multigrain', 120], ['Cheese Burst', 150]],
  sauce:  [['Tomato Basil', 20], ['Garlic Cream', 25], ['Pesto', 30], ['Peri-Peri', 25], ['Smoky Barbecue', 25]],
  cheese: [['Mozzarella', 40], ['Cheddar', 40], ['Parmesan', 50], ['Vegan Cheese', 60]],
  veggie: [['Onion', 10], ['Capsicum', 15], ['Mushroom', 20], ['Sweet Corn', 15], ['Black Olives', 20], ['Jalapeño', 15], ['Tomato', 10], ['Paneer', 30]],
};

const pizzas = [
  {
    name: 'Margherita',
    description: 'Tomato, mozzarella and basil on a hand-tossed base. The classic that never fails.',
    price: 249, base: 'Hand Tossed', sauce: 'Tomato Basil', cheese: 'Mozzarella', veggies: ['Tomato'],
    isVeg: true, spiceLevel: 'Mild',
  },
  {
    name: 'Farmhouse',
    description: 'Mushroom, capsicum, onion and corn under melted cheddar. Farm-fresh goodness.',
    price: 329, base: 'Hand Tossed', sauce: 'Tomato Basil', cheese: 'Cheddar', veggies: ['Mushroom', 'Capsicum', 'Onion', 'Sweet Corn'],
    isVeg: true, spiceLevel: 'Mild',
  },
  {
    name: 'Peri-Peri Paneer',
    description: 'Spicy paneer with jalapeño and onion on thin crust. For those who like it hot.',
    price: 349, base: 'Thin Crust', sauce: 'Peri-Peri', cheese: 'Mozzarella', veggies: ['Paneer', 'Jalapeño', 'Onion'],
    isVeg: true, spiceLevel: 'Hot',
  },
  {
    name: 'Garden Pesto',
    description: 'Pesto, olives and tomato with parmesan on whole wheat. Light and aromatic.',
    price: 369, base: 'Whole Wheat', sauce: 'Pesto', cheese: 'Parmesan', veggies: ['Black Olives', 'Tomato', 'Mushroom'],
    isVeg: true, spiceLevel: 'Mild',
  },
  {
    name: 'Smoky Corn Barbecue',
    description: 'Barbecue sauce, sweet corn and capsicum on multigrain. Smoky, sweet, satisfying.',
    price: 339, base: 'Multigrain', sauce: 'Smoky Barbecue', cheese: 'Cheddar', veggies: ['Sweet Corn', 'Capsicum', 'Onion'],
    isVeg: true, spiceLevel: 'Medium',
  },
  {
    name: 'Burst Supreme',
    description: 'Cheese-burst crust loaded with six vegetables. The ultimate indulgence.',
    price: 429, base: 'Cheese Burst', sauce: 'Garlic Cream', cheese: 'Mozzarella',
    veggies: ['Onion', 'Capsicum', 'Mushroom', 'Black Olives', 'Sweet Corn', 'Paneer'],
    isVeg: true, spiceLevel: 'Medium',
  },
];

await mongoose.connect(process.env.MONGO_URI);

// Seed inventory
for (const [category, list] of Object.entries(stockList))
  for (const [name, price] of list)
    await Inventory.updateOne(
      { category, name },
      { $setOnInsert: { price, stock: 100, threshold: 20 } },
      { upsert: true },
    );

// Seed pizzas
for (const pizza of pizzas)
  await Pizza.updateOne(
    { name: pizza.name },
    {
      $set: {
        description: pizza.description,
        price: pizza.price,
        base: pizza.base,
        sauce: pizza.sauce,
        cheese: pizza.cheese,
        veggies: pizza.veggies,
        isVeg: pizza.isVeg,
        spiceLevel: pizza.spiceLevel,
        available: true,
      },
      $setOnInsert: { name: pizza.name },
    },
    { upsert: true },
  );

// Seed admin
const email = process.env.ADMIN_EMAIL.toLowerCase();
if (!(await User.exists({ email }))) {
  await User.create({
    name: 'Kitchen Admin',
    email,
    role: 'admin',
    verified: true,
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
  });
  console.log(`Admin created: ${email}`);
}

console.log('✓ Seed complete');
await mongoose.disconnect();
