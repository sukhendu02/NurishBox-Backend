// src/config/config.js
import dotenv from "dotenv";
dotenv.config();

const base = {
  url:     process.env.DATABASE_URL,
  dialect: "postgres",
  pool: {
    max:     10,
    min:     2,
    acquire: 30000,
    idle:    10000,
  },
};

export default {
  development: {
    ...base,
    logging: console.log,
  },
  test: {
    ...base,
    logging: false,
  },
  production: {
    ...base,
    logging: false,
    dialectOptions: {
      ssl: {
        require:            true,
        rejectUnauthorized: false,
      },
    },
  },
};