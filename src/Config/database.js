// src/config/database.js
// ─────────────────────────────────────────────────────────────────
// THIS IS THE ONLY FILE THAT CREATES A SEQUELIZE INSTANCE.
// Every model imports `sequelize` from HERE — nowhere else.
// ─────────────────────────────────────────────────────────────────

import { Sequelize } from "sequelize";
import { pathToFileURL } from "url";
import path             from "path";
import { fileURLToPath } from "url";
import config           from "./config.js";

const env      = process.env.NODE_ENV || "development";
const dbConfig = config[env];

// ── Single shared instance ────────────────────────────────────────
export const sequelize = new Sequelize(dbConfig.url, {
  dialect:        dbConfig.dialect,
  logging:        dbConfig.logging,
  pool:           dbConfig.pool,
  dialectOptions: dbConfig.dialectOptions || {},
});

// ── Auto-load all models from src/models/ ─────────────────────────
async function loadModels() {
  const __dirname  = path.dirname(fileURLToPath(import.meta.url));
  const modelsPath = path.join(__dirname, "../models");

  const { default: fs } = await import("fs");

  const modelFiles = fs.readdirSync(modelsPath).filter(
    (file) => file.endsWith(".js") && file !== "index.js"
  );

  for (const file of modelFiles) {
    const fileUrl = pathToFileURL(path.join(modelsPath, file)).href;
    await import(fileUrl);
  }

  // Run associations
  for (const model of Object.values(sequelize.models)) {
    if (typeof model.associate === "function") {
      model.associate(sequelize.models);
    }
  }
}

// ── Connect + Sync ────────────────────────────────────────────────
export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected");

    await loadModels();
    console.log(
      `✅ Models loaded: ${Object.keys(sequelize.models).join(", ")}`
    );

    // alter: true  → dev (updates columns to match model)
    // alter: false → production (use migrations instead)
    const alter = env === "development";
    await sequelize.sync({ alter });
    console.log(`✅ Tables synced (alter: ${alter})`);

  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}