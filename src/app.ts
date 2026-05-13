import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { notFoundHandler } from "./shared/middlewares/notFound.middleware.js";
import { env } from "./config/env.js";
import { errorHandler } from "./shared/middlewares/error.middleware.js";
import { pinoHttp } from "pino-http";
import { logger } from "./shared/utils/logger.js";
import cookieParser from "cookie-parser";
import { SubCategoryRoutes } from "./modules/category/subCategory.routes.js";
import { CategoryRoutes } from "./modules/category/category.routes.js";
import { TrashRoutes } from "./modules/trash/trash.routes.js";
import { ActivityLogRoutes } from "./modules/activityLog/activityLog.route.js";
import { CustomerRoutes } from "./modules/customer/customer.routes.js";
import { SaleRoutes } from "./modules/sale/sale.route.js";
import { AuthRoutes } from "./modules/auth/auth.routes.js";
import { InvoiceRoutes } from "./modules/invoice/invoice.routes.js";
import { StaffRoutes } from "./modules/staff/staff.routes.js";
import { PricingPlanRoutes } from "./modules/pricingPlan/pricingPlan.routes.js";

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

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/categories", CategoryRoutes);
app.use("/api/v1/sub-categories", SubCategoryRoutes);
app.use("/api/v1/customers", CustomerRoutes);
app.use("/api/v1/sales", SaleRoutes);
app.use("/api/v1/invoices", InvoiceRoutes);
app.use("/api/v1/trash", TrashRoutes);
app.use("/api/v1/activity-logs", ActivityLogRoutes);
app.use("/api/v1/staff", StaffRoutes);
app.use("/api/v1/pricing-plans", PricingPlanRoutes);

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
