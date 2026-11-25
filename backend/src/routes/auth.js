'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const config = require('../config');
const { query } = require('../db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
// Used so a login for an unknown email takes the same time as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const email = z.string().trim().toLowerCase().email().max(254);

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long (72 bytes maximum)'),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

function signToken(user) {
  return jwt.sign({ role: user.role }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: config.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    let user;
    try {
      const { rows } = await query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, role`,
        [data.email, passwordHash, data.name]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(409, 'Email is already registered');
      }
      throw err;
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);

    const { rows } = await query(
      `SELECT id, email, name, role, password_hash
       FROM users WHERE LOWER(email) = $1`,
      [data.email]
    );
    const user = rows[0];

    const passwordOk = await bcrypt.compare(
      data.password,
      user ? user.password_hash : DUMMY_HASH
    );
    if (!user || !passwordOk) {
      throw new AppError(401, 'Invalid email or password');
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
