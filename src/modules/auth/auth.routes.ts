import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";
import { authenticate } from "@/shared/middlewares/authenticate.js";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.registerZodSchema),
  AuthController.register,
);
router.post("/login", validateRequest(AuthValidation.loginZodSchema), AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authenticate, AuthController.getMe);

export const AuthRoutes: Router = router;
