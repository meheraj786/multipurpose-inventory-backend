import { Router } from "express";
import { authenticate, authorizeRoles } from "../../shared/middlewares/authenticate.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { PricingPlanController } from "./pricingPlan.controller.js";
import { PricingPlanValidation } from "./pricingPlan.validation.js";

const router = Router();

router.get("/", PricingPlanController.getAllPricingPlans);
router.get("/:id", PricingPlanController.getSinglePricingPlan);

router.use(authenticate, authorizeRoles("DEVELOPER"));

router.post(
  "/",
  validateRequest(PricingPlanValidation.createPricingPlanZodSchema),
  PricingPlanController.createPricingPlan,
);
router.patch(
  "/:id",
  validateRequest(PricingPlanValidation.updatePricingPlanZodSchema),
  PricingPlanController.updatePricingPlan,
);
router.patch("/:id/toggle", PricingPlanController.toggleActive);
router.delete("/:id", PricingPlanController.deletePricingPlan);

export const PricingPlanRoutes: Router = router;
