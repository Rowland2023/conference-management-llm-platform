import "dotenv/config";
import { PinoLogger } from "./cross-cutting/logging/PinoLogger.js";
import { createApp } from "./app.js";

import {
  verifyDatabaseConnection,
  closeDatabaseConnection,
} from "./cross-cutting/database/knex.js";

const PORT = Number(process.env.PORT) || 3000;
const SHUTDOWN_TIMEOUT = 10_000;

const logger = new PinoLogger();

let server = null;
let application = null;
let shuttingDown = false;

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                   */
/* -------------------------------------------------------------------------- */

async function bootstrap() {
  try {
    await verifyInfrastructure();

    application = await createApp({
      logger,
    });

    await application.start();

    server = await startHttpServer(application.app);

    logger.info(
      `🚀 Conference Management API listening on http://localhost:${PORT}`
    );
  } catch (error) {
    logger.error("❌ Failed to start application.");
    logger.error(error);

    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/* Infrastructure                                                               */
/* -------------------------------------------------------------------------- */

async function verifyInfrastructure() {
  await verifyDatabaseConnection();

  logger.info("📡 Database connected successfully.");
}

/* -------------------------------------------------------------------------- */
/* HTTP Server                                                                  */
/* -------------------------------------------------------------------------- */

function startHttpServer(app) {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(PORT);

    httpServer.once("listening", () => {
      resolve(httpServer);
    });

    httpServer.once("error", reject);
  });
}

function stopHttpServer() {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        return reject(error);
      }

      logger.info("✅ HTTP server stopped.");

      resolve();
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Graceful Shutdown                                                            */
/* -------------------------------------------------------------------------- */

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    logger.error(
      `❌ Shutdown exceeded ${SHUTDOWN_TIMEOUT}ms. Forcing exit.`
    );

    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    await stopHttpServer();

    if (application?.stop) {
      await application.stop();

      logger.info("✅ Application stopped.");
    }

    await closeDatabaseConnection();

    logger.info("✅ Database connection closed.");

    clearTimeout(timeout);

    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);

    logger.error(
    "❌ Failed to start application.",
    {
        err: error,
    }
);

    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/* Process Events                                                               */
/* -------------------------------------------------------------------------- */

process.once("SIGINT", () => shutdown("SIGINT"));

process.once("SIGTERM", () => shutdown("SIGTERM"));

process.once("uncaughtException", error => {
  logger.error("❌ Uncaught Exception");
  logger.error(error);

  shutdown("uncaughtException");
});

process.once("unhandledRejection", reason => {
  logger.error("❌ Unhandled Rejection");
  logger.error(reason);

  shutdown("unhandledRejection");
});

/* -------------------------------------------------------------------------- */
/* Start Application                                                            */
/* -------------------------------------------------------------------------- */

bootstrap();