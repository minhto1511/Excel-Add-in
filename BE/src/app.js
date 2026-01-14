import express from "express";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import aiRouter from "./routes/ai.routes.js";
import conversationRouter from "./routes/conversation.routes.js";
import authRouter from "./routes/auth.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";

const app = express();

// CORS Configuration - Cho phép Excel Add-in gọi API
app.use(
  cors({
    origin: [
      "https://localhost:3000",
      "http://localhost:3000",
      "https://localhost:4000",
      "http://localhost:4000",
      "https://localhost:4001",
      "http://localhost:4001",
      "null", // Excel taskpane origin
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Casso-Signature",
      "Secure-Token",
    ],
    exposedHeaders: ["X-Request-ID"],
  })
);

// Middleware parse JSON
app.use(express.json());

// General rate limiter
app.use(generalLimiter);

// API Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/conversations", conversationRouter);

// New routes for auth and payment
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/admin", adminRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({ error: "INTERNAL_ERROR", message: "Internal server error" });
});

export default app;
