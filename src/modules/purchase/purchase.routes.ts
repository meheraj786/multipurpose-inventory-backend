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

router.get("/:id", checkPermission("PURCHASE"), PurchaseController.getSinglePurchase);

router.delete("/:id", checkPermission("PURCHASE"), PurchaseController.deletePurchase);

export const PurchaseRoutes: Router = router;
