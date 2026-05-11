import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { SaleController } from "./sale.controller.js";
import { SaleValidation } from "./sale.validation.js";

const router = Router();

router.post("/", validateRequest(SaleValidation.createSaleZodSchema), SaleController.createSale);
router.get("/", SaleController.getAllSales);
router.get("/:id", SaleController.getSingleSale);
router.patch(
  "/:id",
  validateRequest(SaleValidation.updateSaleZodSchema),
  SaleController.updateSale,
);
router.delete("/:id", SaleController.deleteSale);

export const SaleRoutes: Router = router;
