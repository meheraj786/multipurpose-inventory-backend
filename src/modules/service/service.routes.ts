import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { ServiceController } from "./service.controller.js";
import { ServiceValidation } from "./service.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("SERVICE"),
  validateRequest(ServiceValidation.createServiceZodSchema),
  ServiceController.createService,
);
router.get("/", checkPermission("SERVICE"), ServiceController.getAllServices);
router.get("/:id", checkPermission("SERVICE"), ServiceController.getSingleService);
router.patch(
  "/:id",
  checkPermission("SERVICE"),
  validateRequest(ServiceValidation.updateServiceZodSchema),
  ServiceController.updateService,
);
router.delete("/:id", checkPermission("SERVICE"), ServiceController.deleteService);

export const ServiceRoutes = router;