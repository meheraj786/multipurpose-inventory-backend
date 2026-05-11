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

export const CategoryRoutes: Router = router;
