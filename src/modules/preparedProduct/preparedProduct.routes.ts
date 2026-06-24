import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { PreparedProductController } from "./preparedProduct.controller.js";
import { PreparedProductValidation } from "./preparedProduct.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("PREPARED_PRODUCT"),
  validateRequest(PreparedProductValidation.createPreparedProductZodSchema),
  PreparedProductController.createPreparedProduct,
);
router.get(
  "/",
  checkPermission("PREPARED_PRODUCT"),
  PreparedProductController.getAllPreparedProducts,
);
router.get(
  "/:id",
  checkPermission("PREPARED_PRODUCT"),
  PreparedProductController.getSinglePreparedProduct,
);
router.patch(
  "/:id",
  checkPermission("PREPARED_PRODUCT"),
  validateRequest(PreparedProductValidation.updatePreparedProductZodSchema),
  PreparedProductController.updatePreparedProduct,
);
router.delete(
  "/:id",
  checkPermission("PREPARED_PRODUCT"),
  PreparedProductController.deletePreparedProduct,
);
router.post(
  "/:id/produce",
  checkPermission("PREPARED_PRODUCT"),
  PreparedProductController.produceStock,
);

export const PreparedProductRoutes: Router = router;
