import { Router } from "express";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();

router.get(
  "/sales-overview",
  checkPermission("SALE", "READ"),
  DashboardController.getSalesOverview,
);
router.get(
  "/stats",
  checkPermission("SALE", "READ"),
  checkPermission("CUSTOMER", "READ"),
  DashboardController.getOverviewStats,
);
router.get(
  "/top-customers",
  checkPermission("SALE", "READ"),
  checkPermission("CUSTOMER", "READ"),
  DashboardController.getTopCustomers,
);
router.get(
  "/due-ranking",
  checkPermission("SALE", "READ"),
  checkPermission("CUSTOMER", "READ"),
  DashboardController.getDueRanking,
);
router.get(
  "/category-ranking",
  checkPermission("SALE", "READ"),
  DashboardController.getCategoryRanking,
);
router.get(
  "/product-ranking",
  checkPermission("SALE", "READ"),
  DashboardController.getProductRanking,
);
router.get(
  "/low-stock-alert",
  checkPermission(["PRODUCT", "RAW_PRODUCT"], "READ"),
  DashboardController.getLowStockAlert,
);
router.get(
  "/top-suppliers",
  checkPermission("PURCHASE", "READ"),
  checkPermission("SUPPLIER", "READ"),
  DashboardController.getTopSuppliers,
);
router.get(
  "/purchase-overview",
  checkPermission("PURCHASE", "READ"),
  DashboardController.getPurchaseOverview,
);
router.get(
  "/purchase-report",
  checkPermission("PURCHASE", "READ"),
  DashboardController.getPurchaseReport,
);

export const DashboardRoutes: Router = router;
