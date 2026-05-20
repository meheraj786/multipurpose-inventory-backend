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
import { ServiceRoutes } from "./modules/service/service.routes.js";
import { authenticate } from "./shared/middlewares/authenticate.js";
import { checkPermission } from "./shared/middlewares/checkPermission.js";

const app: Express = express();

// ==================== SECURITY ====================
app.use(helmet());
// app.ts
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// ==================== BODY PARSING ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==================== LOGGING ====================
app.use(
  pinoHttp({
    logger,
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

// ==================== HEALTH CHECK ====================
// Must be before other routes — this is what UptimeRobot will ping
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MP Inventory API is running",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ==================== API ROUTES ====================
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/categories", authenticate, checkPermission("CATEGORY"), CategoryRoutes);
app.use("/api/v1/sub-categories", authenticate, checkPermission("SUBCATEGORY"), SubCategoryRoutes);
app.use("/api/v1/customers", authenticate, checkPermission("CUSTOMER"), CustomerRoutes);
app.use("/api/v1/sales", authenticate, checkPermission("SALE"), SaleRoutes);
app.use("/api/v1/invoices", InvoiceRoutes);
app.use("/api/v1/trash", TrashRoutes);
app.use("/api/v1/activity-logs", authenticate, checkPermission("ACTIVITY_LOG"), ActivityLogRoutes);
app.use("/api/v1/staff", StaffRoutes);
app.use("/api/v1/pricing-plans", authenticate, checkPermission("PRICING_PLAN"), PricingPlanRoutes);
app.use("/api/v1/services", authenticate, checkPermission("SERVICE"), ServiceRoutes);

// ==================== ERROR HANDLING ====================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
