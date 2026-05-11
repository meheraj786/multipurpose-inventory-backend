import { Router } from "express";
import { CustomerController } from "./customer.controller.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { CustomerValidation } from "./customer.validation.js";

const router = Router();

router.post(
  "/",
  validateRequest(CustomerValidation.createCustomerZodSchema),
  CustomerController.createCustomer,
);
router.get("/", CustomerController.getAllCustomers);
router.get("/:id", CustomerController.getSingleCustomer);
router.patch(
  "/:id",
  validateRequest(CustomerValidation.updateCustomerZodSchema),
  CustomerController.updateCustomer,
);
router.delete("/:id", CustomerController.deleteCustomer);

export const CustomerRoutes: Router = router;
