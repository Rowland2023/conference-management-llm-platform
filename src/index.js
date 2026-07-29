import 'dotenv/config';
import { createApp } from './app.js';
import {
  verifyDatabaseConnection,
  closeDatabaseConnection,
} from './cross-cutting/database/knex.js'; // Fixed: hyphenated path matching disk

const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server = null;
let appInstance = null;
let isShuttingDown = false;

/**
 * Gracefully shuts down the application.
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    console.error(
      `❌ Shutdown timed out (${SHUTDOWN_TIMEOUT_MS}ms). Forcing exit.`
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // 1. Stop accepting new HTTP requests
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('✅ HTTP server stopped.');
    }

    // 2. Stop background workers, outbox publishers & event bus consumers
    if (appInstance?.stop) {
      await appInstance.stop();
      console.log('✅ Background workers stopped.');
    }

    // 3. Close database connection pool
    await closeDatabaseConnection();
    console.log('✅ Database connection pool closed.');

    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

/**
 * Process lifecycle handlers
 */
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

/**
 * Application bootstrap.
 */
async function start() {
  try {
    // Verify database connection before building composition root
    await verifyDatabaseConnection();
    console.log('📡 Database connected successfully.');

    // Build composition root & wire dependencies
    appInstance = await createApp();

    // Start background services & outbox daemons
    if (appInstance.start) {
      await appInstance.start();
    }

    // Start HTTP server
    server = appInstance.app.listen(PORT, () => {
      console.log(
        `🚀 Conference Management API running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('❌ Failed to start application.');
    console.error(error);
    process.exit(1);
  }
}

start();