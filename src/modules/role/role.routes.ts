import { Router } from "express";
import { authenticate, authorizeRoles } from "../../shared/middlewares/authenticate.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { RoleController } from "./role.controller.js";
import { RoleValidation } from "./role.validation.js";

const router = Router();

router.use(authenticate, authorizeRoles("ADMIN"));
router.get("/", RoleController.getAllRoles);
router.get("/:id", RoleController.getSingleRole);
router.post("/", validateRequest(RoleValidation.createRoleZodSchema), RoleController.createRole);
router.patch(
  "/:id",
  validateRequest(RoleValidation.updateRoleZodSchema),
  RoleController.updateRole,
);
router.delete("/:id", RoleController.deleteRole);

export const RoleRoutes = router;
