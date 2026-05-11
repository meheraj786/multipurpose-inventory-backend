import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { CategoryController } from "./category.controller.js";
import { CategoryValidation } from "./category.validation.js";

const router: Router = Router();

router.post(
  "/",
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory,
);
router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getSingleCategory);
router.patch(
  "/:id",
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory,
);
router.delete("/:id", CategoryController.deleteCategory);

export const CategoryRoutes = router;
