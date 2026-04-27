import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { notFoundHandler } from "./shared/middlewares/notFound.middleware.js";
import { env } from "./config/env.js";
import { errorHandler } from "./shared/middlewares/error.middleware.js";
import { pinoHttp } from "pino-http";
import { logger } from "./shared/utils/logger.js";
import cookieParser from "cookie-parser";

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: "*",
  }),
);
console.log("hello world");
// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(
  pinoHttp({
    logger,

    // The exact, simple format: "GET /api/inventory/restock 200"
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },

    // Same thing for errors, but tacks on the error reason
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },

    // Keeps the colors color-coded by success/fail
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
      return "info";
    },
  }),
);

// Health check
app.get(`/api/${env.API_VERSION}/health`, (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MP Inventory API is running",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
