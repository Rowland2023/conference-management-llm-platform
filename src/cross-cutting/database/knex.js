// src/cross-cutting/database/knex.js

import knex from "knex";

/**
 * Validate required environment variables.
 */
const requiredEnv = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];

for (const variable of requiredEnv) {

  if (!process.env[variable]) {

    throw new Error(
      `Missing required environment variable: ${variable}`
    );

  }

}

const knexConfig = {

  client: "pg",

  connection: {

    host:
      process.env.DB_HOST,

    port:
      Number(process.env.DB_PORT),

    user:
      process.env.DB_USER,

    password:
      process.env.DB_PASSWORD,

    database:
      process.env.DB_NAME,

    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,

  },

  pool: {

    min:
      Number(process.env.DB_POOL_MIN ?? 2),

    max:
      Number(process.env.DB_POOL_MAX ?? 10),

    idleTimeoutMillis:
      30000,

  },

};

const db = knex(knexConfig);

export default db;

/**
 * Verify database connectivity.
 */
export async function verifyDatabaseConnection() {

  await db.raw("SELECT 1");

}

/**
 * Gracefully close database connection.
 */
export async function closeDatabaseConnection() {

  await db.destroy();

}