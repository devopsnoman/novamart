'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');
const { pool } = require('../db');

const PRODUCTS = [
  ['Wireless Headphones', 'wireless-headphones', 'Over-ear Bluetooth headphones with 30 hour battery life.', 8999, 40, 'electronics'],
  ['Smart Watch', 'smart-watch', 'Fitness tracking, heart rate and notifications on your wrist.', 12999, 25, 'electronics'],
  ['Portable Power Bank', 'portable-power-bank', '20000 mAh power bank with fast charging.', 3499, 80, 'electronics'],
  ['Mechanical Keyboard', 'mechanical-keyboard', 'Compact keyboard with tactile switches and backlight.', 6499, 30, 'electronics'],
  ['Ceramic Coffee Mug Set', 'ceramic-coffee-mug-set', 'Set of four 300 ml ceramic mugs.', 1999, 100, 'home'],
  ['LED Desk Lamp', 'led-desk-lamp', 'Dimmable desk lamp with three colour modes.', 2799, 60, 'home'],
  ['Cotton Bed Sheet Set', 'cotton-bed-sheet-set', 'Soft double bed sheet set with two pillow covers.', 4599, 35, 'home'],
  ['Stainless Steel Water Bottle', 'stainless-steel-water-bottle', 'Insulated 750 ml bottle, keeps drinks cold for 24 hours.', 1799, 120, 'home'],
  ['Classic Cotton T-Shirt', 'classic-cotton-t-shirt', 'Regular fit crew neck t-shirt, 100% cotton.', 1499, 150, 'fashion'],
  ['Running Shoes', 'running-shoes', 'Lightweight running shoes with breathable mesh.', 5999, 45, 'fashion'],
  ['Canvas Backpack', 'canvas-backpack', 'Durable 25 litre backpack with laptop compartment.', 3999, 55, 'fashion'],
  ['Clean Code Notebook', 'clean-code-notebook', 'Hardcover dotted notebook for engineers.', 999, 200, 'stationery'],
];

async function seed() {
  for (const [name, slug, description, priceCents, stock, category] of PRODUCTS) {
    await pool.query(
      `INSERT INTO products (name, slug, description, price_cents, stock, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [name, slug, description, priceCents, stock, category]
    );
  }
  console.log(`Products ready (${PRODUCTS.length} sample products).`);

  if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, 'Admin', 'admin')
       ON CONFLICT ((LOWER(email))) DO NOTHING`,
      [config.ADMIN_EMAIL.toLowerCase(), hash]
    );
    console.log(res.rowCount === 1 ? 'Admin user created.' : 'Admin user already exists.');
  } else {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set, admin user skipped.');
  }
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
