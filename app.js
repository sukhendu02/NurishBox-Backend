import express, { Router } from "express";
import cors from "cors";
// import authRoute from "./src/modules/auth/Route/authRoute"
import authRoute from "./src/modules/auth/Route/authRoute.js";
import { errorHandler, notFoundHandler } from "./src/middleware/ErrorHandler.js";

const app = express();


// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());





// ROUTES
app.use("/api/v1/auth", authRoute);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});
// // API VERSIONING
// app.use("/api/v1", (req, res) => {
//   res.status(200).json({ message: "Welcome to the API version 1" });
  
// });

// ── 404 — must be AFTER all routes ───────────────────────────────
app.use(notFoundHandler);
 
// ── Global error handler — must be LAST ──────────────────────────
app.use(errorHandler);
 
export default app;