'use strict';

const redis = require('./redis');

/**
 * Cache-aside helper. Redis is optional: if it is missing or down,
 * the loader runs and the app keeps working.
 *
 * Invalidation uses a version number: all keys of a namespace include
 * the current version, and invalidate() just bumps it (old keys expire by TTL).
 */
async function cacheAside(namespace, keyPart, ttlSeconds, loader) {
  if (!redis.isReady()) return loader();

  let key;
  try {
    const version = (await redis.client.get(`ver:${namespace}`)) || '0';
    key = `${namespace}:${version}:${keyPart}`;
    const hit = await redis.client.get(key);
    if (hit) return JSON.parse(hit);
  } catch (err) {
    key = null; // Redis failed, just load from the database
  }

  const value = await loader();

  if (key) {
    try {
      await redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      /* ignore cache write failures */
    }
  }
  return value;
}

async function invalidate(namespace) {
  if (!redis.isReady()) return;
  try {
    await redis.client.incr(`ver:${namespace}`);
  } catch (err) {
    /* ignore */
  }
}

module.exports = { cacheAside, invalidate };
