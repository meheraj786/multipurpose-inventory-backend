import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { checkPermission } from "../../shared/middlewares/checkPermission.js";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { ProductController } from "./product.controller.js";
import { ProductValidation } from "./product.validation.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  checkPermission("PRODUCT"),
  validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct,
);

router.get(
  "/",
  checkPermission("PRODUCT"),
  ProductController.getAllProducts,
);

router.get(
  "/:id",
  checkPermission("PRODUCT"),
  ProductController.getSingleProduct,
);

router.patch(
  "/:id",
  checkPermission("PRODUCT"),
  validateRequest(ProductValidation.updateProductZodSchema),
  ProductController.updateProduct,
);

router.delete(
  "/:id",
  checkPermission("PRODUCT"),
  ProductController.deleteProduct,
);

router.post(
  "/:id/stock-in",
  checkPermission("PRODUCT"),
  validateRequest(ProductValidation.stockInZodSchema),
  ProductController.stockIn,
);

router.get(
  "/:id/stock-summary",
  checkPermission("PRODUCT"),
  ProductController.getStockSummary,
);

export const ProductRoutes: Router = router;