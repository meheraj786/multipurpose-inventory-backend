import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { PurchaseController } from "./purchase.controller.js";
import { PurchaseValidation } from "./purchase.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("PURCHASE"),
  validateRequest(PurchaseValidation.createPurchaseZodSchema),
  PurchaseController.createPurchase,
);

router.get("/", checkPermission("PURCHASE"), PurchaseController.getAllPurchases);

router.get("/dues/summary", checkPermission("PURCHASE"), PurchaseController.getDueSummary);

router.get(
  "/dues/suppliers",
  checkPermission("PURCHASE"),
  PurchaseController.getSupplierDueSummary,
);

router.get(
  "/dues/suppliers/:supplierId",
  checkPermission("PURCHASE"),
  validateRequest(PurchaseValidation.getSupplierLedgerZodSchema),
  PurchaseController.getSupplierPurchaseLedger,
);

router.get("/:id", checkPermission("PURCHASE"), PurchaseController.getSinglePurchase);

router.get("/:id/payments", checkPermission("PURCHASE"), PurchaseController.getPurchasePayments);

router.post(
  "/:id/payments",
  checkPermission("PURCHASE"),
  validateRequest(PurchaseValidation.recordPurchasePaymentZodSchema),
  PurchaseController.recordPayment,
);

router.patch(
  "/:id",
  checkPermission("PURCHASE"),
  validateRequest(PurchaseValidation.updatePurchaseZodSchema),
  PurchaseController.updatePurchase,
);

router.patch("/:id/restore", checkPermission("PURCHASE"), PurchaseController.restorePurchase);

router.delete("/:id", checkPermission("PURCHASE"), PurchaseController.deletePurchase);

export const PurchaseRoutes: Router = router;
