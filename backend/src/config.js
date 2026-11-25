'use strict';

require('dotenv').config();
const { z } = require('zod');
const { fieldErrors } = require('./utils/zodErrors');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).max(72).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(JSON.stringify(fieldErrors(parsed.error), null, 2));
  process.exit(1);
}

const env = parsed.data;

module.exports = Object.freeze({
  ...env,
  isProd: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
});
