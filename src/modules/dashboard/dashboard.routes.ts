import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();

router.get("/sales-overview", DashboardController.getSalesOverview);
router.get("/stats", DashboardController.getOverviewStats);
router.get("/top-customers", DashboardController.getTopCustomers);
router.get("/due-ranking", DashboardController.getDueRanking);
router.get("/category-ranking", DashboardController.getCategoryRanking);
router.get("/product-ranking", DashboardController.getProductRanking);
router.get("/low-stock-alert", DashboardController.getLowStockAlert);
router.get("/top-suppliers", DashboardController.getTopSuppliers);

router.get("/purchase-overview", DashboardController.getPurchaseOverview);

router.get("/purchase-report", DashboardController.getPurchaseReport);

export const DashboardRoutes: Router = router;
