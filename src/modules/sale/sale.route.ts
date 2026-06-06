import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { SaleController } from "./sale.controller.js";
import { SaleValidation } from "./sale.validation.js";
import { InvoiceValidation } from "../invoice/invoice.validation.js";

const router = Router();

router.post("/", validateRequest(SaleValidation.createSaleZodSchema), SaleController.createSale);
router.get("/", SaleController.getAllSales);
router.get("/:id", SaleController.getSingleSale);
router.patch(
  "/:id",
  validateRequest(SaleValidation.updateSaleZodSchema),
  SaleController.updateSale,
);
router.post(
  "/:id/pay-due",
  validateRequest(InvoiceValidation.payDueZodSchema),
  SaleController.payDue,
);
router.delete("/:id", SaleController.deleteSale);

export const SaleRoutes: Router = router;
