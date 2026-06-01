import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { SupplierController } from "./supplier.controller.js";
import { SupplierValidation } from "./supplier.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("SUPPLIER"),
  validateRequest(SupplierValidation.createSupplierZodSchema),
  SupplierController.createSupplier,
);

router.get(
  "/",
  checkPermission("SUPPLIER"),
  SupplierController.getAllSuppliers,
);

router.get(
  "/:id",
  checkPermission("SUPPLIER"),
  SupplierController.getSingleSupplier,
);

router.patch(
  "/:id",
  checkPermission("SUPPLIER"),
  validateRequest(SupplierValidation.updateSupplierZodSchema),
  SupplierController.updateSupplier,
);

router.patch(
  "/:id/toggle-active",
  checkPermission("SUPPLIER"),
  SupplierController.toggleActive,
);

router.delete(
  "/:id",
  checkPermission("SUPPLIER"),
  SupplierController.deleteSupplier,
);

export const SupplierRoutes: Router = router;