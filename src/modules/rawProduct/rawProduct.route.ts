import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { RawProductController } from "./rawProduct.controller.js";
import { RawProductValidation } from "./rawProduct.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("RAW_PRODUCT"),
  validateRequest(RawProductValidation.createRawProductZodSchema),
  RawProductController.createRawProduct,
);
router.get("/", checkPermission("RAW_PRODUCT"), RawProductController.getAllRawProducts);
router.get("/:id", checkPermission("RAW_PRODUCT"), RawProductController.getSingleRawProduct);
router.patch(
  "/:id",
  checkPermission("RAW_PRODUCT"),
  validateRequest(RawProductValidation.updateRawProductZodSchema),
  RawProductController.updateRawProduct,
);
router.delete("/:id", checkPermission("RAW_PRODUCT"), RawProductController.deleteRawProduct);
router.post(
  "/:id/stock-in",
  checkPermission("RAW_PRODUCT"),
  validateRequest(RawProductValidation.stockInZodSchema),
  RawProductController.stockIn,
);

export const RawProductRoutes: Router = router;
