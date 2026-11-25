'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const AppError = require('./utils/AppError');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
// We run behind one proxy (ingress / load balancer) later.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan(config.isProd ? 'combined' : 'dev'));

// Slow down password guessing: only FAILED attempts (status 400+) count,
// default 20 per 15 minutes per IP (200 in development). Override with AUTH_RATE_LIMIT_MAX.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.AUTH_RATE_LIMIT_MAX || (config.isProd ? 20 : 200),
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new AppError(429, 'Too many attempts, please try again later')),
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
