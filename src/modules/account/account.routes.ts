import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { AccountController } from "./account.controller.js";
import { AccountValidation } from "./account.validation.js";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  checkPermission("ACCOUNT"),
  AccountController.getMyAccountDetails,
);

router.patch(
  "/me",
  checkPermission("ACCOUNT"),
  validateRequest(AccountValidation.updateAccountZodSchema),
  AccountController.updateMyAccount,
);

router.post(
  "/",
  checkPermission("ACCOUNT"),
  validateRequest(AccountValidation.createAccountZodSchema),
  AccountController.createAccount,
);

router.get(
  "/",
  checkPermission("ACCOUNT"),
  AccountController.getAllAccounts,
);

router.get(
  "/:id",
  checkPermission("ACCOUNT"),
  AccountController.getSingleAccount,
);

router.patch(
  "/:id",
  checkPermission("ACCOUNT"),
  validateRequest(AccountValidation.updateAccountZodSchema),
  AccountController.updateSingleAccount,
);

router.delete(
  "/:id",
  checkPermission("ACCOUNT"),
  AccountController.deleteAccount,
);

export const AccountRoutes: Router = router;