import "dotenv/config";

export default {
  development: {
    client: "pg",

    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
    },

    migrations: {
      directory: "./src/cross-cutting/database/migrations",
    },
  },
};