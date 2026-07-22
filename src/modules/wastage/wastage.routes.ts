import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { WastageController } from "./wastage.controller.js";
import { WastageValidation } from "./wastage.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("WASTAGE"),
  validateRequest(WastageValidation.createWastageZodSchema),
  WastageController.createWastage,
);

router.get("/", checkPermission("WASTAGE"), WastageController.getAllWastages);

router.get("/:id", checkPermission("WASTAGE"), WastageController.getSingleWastage);

router.patch(
  "/:id",
  checkPermission("WASTAGE"),
  validateRequest(WastageValidation.updateWastageZodSchema),
  WastageController.updateWastage,
);

router.delete("/:id", checkPermission("WASTAGE"), WastageController.deleteWastage);

export const WastageRoutes: Router = router;
