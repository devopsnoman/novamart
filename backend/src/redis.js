'use strict';

const Redis = require('ioredis');
const config = require('./config');

let client = null;
let lastErrorLog = 0;

if (config.REDIS_URL) {
  client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // fail fast when Redis is down (cache is optional)
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  client.on('error', (err) => {
    // Log at most once every 30 seconds so a Redis outage does not flood logs.
    const now = Date.now();
    if (now - lastErrorLog > 30000) {
      lastErrorLog = now;
      console.error('Redis error:', err.message);
    }
  });
}

const isConfigured = () => client !== null;
const isReady = () => client !== null && client.status === 'ready';

async function closeRedis() {
  if (!client) return;
  try {
    await client.quit();
  } catch (err) {
    client.disconnect();
  }
}

module.exports = { client, isConfigured, isReady, closeRedis };
