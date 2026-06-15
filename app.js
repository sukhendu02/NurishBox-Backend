import express, { Router } from "express";
import cors from "cors";
// import authRoute from "./src/modules/auth/Route/authRoute"
import authRoute from "./src/modules/auth/Route/authRoute.js";
import cartRoute from "./src/modules/cart/route/cartRoute.js"
import productRoute from "./src/modules/products/route/productRoute.js"
import userRoute from "./src/modules/user/route/userRoute.js"
import orderRoute from "./src/modules/order/Routes/orderRoute.js"
import paymentRoute from "./src/modules/payment/Route/paymentRoute.js"
import { errorHandler, notFoundHandler } from "./src/middleware/ErrorHandler.js";
import { sessionMiddleware } from "./src/middleware/sessionMiddleware.js";
import cookieParser from "cookie-parser";
import webhookRoute from "./src/modules/payment/Route/webhookRoute.js"

const app = express();




// Enable CORS
app.use(cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_URL], // ← your Vite frontend exact URL
    credentials: true,                // ← required because frontend uses withCredentials: true
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization","x-idempotency-key"],
  }));


app.use("/api/v1/webhook",webhookRoute)

// Body parser
app.use(express.json());

app.use(cookieParser());         // must be before sessionMiddleware
app.use(sessionMiddleware); 




// ROUTES
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/menu",productRoute)
app.use("/api/v1/user",userRoute)
app.use("/api/v1/order",orderRoute)
app.use("/api/v1/payment",paymentRoute)

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