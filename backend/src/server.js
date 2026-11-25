'use strict';

const config = require('./config');
const app = require('./app');
const { pool } = require('./db');
const { closeRedis } = require('./redis');

const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`NovaMart API listening on port ${config.PORT} (${config.NODE_ENV})`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  // Force exit if shutdown hangs.
  const force = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  force.unref();

  server.close(async () => {
    try {
      await closeRedis();
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
