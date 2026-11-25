'use strict';

const express = require('express');
const { query } = require('../db');
const redis = require('../redis');

const router = express.Router();

// Liveness: is the process running? (no dependencies checked)
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

function redisStatus() {
  if (!redis.isConfigured()) return 'disabled';
  return redis.isReady() ? 'up' : 'down';
}

// Readiness: can the app serve traffic? PostgreSQL is required;
// Redis is only a cache, so it never makes the app "not ready".
async function readiness(req, res) {
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: 'up', cache: redisStatus() },
    });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({
      status: 'unavailable',
      checks: { database: 'down', cache: redisStatus() },
    });
  }
}

router.get('/ready', readiness);
router.get('/', readiness);

module.exports = router;
