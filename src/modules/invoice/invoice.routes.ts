import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { InvoiceController } from "./invoice.controller.js";
import { InvoiceValidation } from "./invoice.validation.js";

const router = Router();

router.post(
  "/",
  validateRequest(InvoiceValidation.createInvoiceZodSchema),
  InvoiceController.createInvoice,
);
router.get("/", InvoiceController.getAllInvoices);
router.get("/:id", InvoiceController.getSingleInvoice);
router.patch(
  "/:id",
  validateRequest(InvoiceValidation.updateInvoiceZodSchema),
  InvoiceController.updateInvoice,
);
router.delete("/:id", InvoiceController.deleteInvoice);

export const InvoiceRoutes: Router = router;
