import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { authorizeRoles } from "../../shared/middlewares/authenticate.js";
import { StaffController } from "./staff.controller.js";
import { StaffValidation } from "./staff.validation.js";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN"));

router.post(
  "/",
  validateRequest(StaffValidation.createStaffZodSchema),
  StaffController.createStaff,
);
router.get("/", StaffController.getAllStaff);
router.get("/:id", StaffController.getSingleStaff);
router.patch(
  "/:id",
  validateRequest(StaffValidation.updateStaffZodSchema),
  StaffController.updateStaff,
);
router.delete("/:id", StaffController.deleteStaff);

export const StaffRoutes: Router = router;
