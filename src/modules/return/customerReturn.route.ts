import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { CustomerReturnController } from "./customerReturn.controller.js";
import { CustomerReturnValidation } from "./customerReturn.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("SALE"),
  validateRequest(CustomerReturnValidation.createCustomerReturnZodSchema),
  CustomerReturnController.createCustomerReturn,
);

router.get("/", checkPermission("SALE"), CustomerReturnController.getAllReturns);

router.get("/:id", checkPermission("SALE"), CustomerReturnController.getSingleReturn);

router.patch(
  "/:id",
  checkPermission("SALE"),
  validateRequest(CustomerReturnValidation.updateCustomerReturnZodSchema),
  CustomerReturnController.updateReturn,
);

router.delete("/:id", checkPermission("SALE"), CustomerReturnController.deleteReturn);

export const CustomerReturnRoutes: Router = router;
