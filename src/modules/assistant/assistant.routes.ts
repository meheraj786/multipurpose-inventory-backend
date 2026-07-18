import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantValidation } from "./assistant.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/chat",
  validateRequest(AssistantValidation.askAssistantZodSchema),
  AssistantController.askAssistant
);

export const AssistantRoutes = router;