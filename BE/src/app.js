import express from "express";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import aiRouter from "./routes/ai.routes.js";
import conversationRouter from "./routes/conversation.routes.js";

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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware parse JSON
app.use(express.json());

// API Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/conversations", conversationRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

export default app;
