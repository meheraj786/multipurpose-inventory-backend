import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { UnitController } from "./unit.controller.js";
import { UnitValidation } from "./unit.validation.js";

const router = Router();

router.use(authenticate);

router.get("/", UnitController.getAllUnits);
router.get("/grouped", UnitController.getUnitsByGroup);
router.get("/:id/compatible", UnitController.getCompatibleUnits);
router.post("/", validateRequest(UnitValidation.createUnitZodSchema), UnitController.createUnit);
router.patch(
  "/:id",
  validateRequest(UnitValidation.updateUnitZodSchema),
  UnitController.updateUnit,
);

export const UnitRoutes: Router = router;
