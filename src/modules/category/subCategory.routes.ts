import { Router } from "express";
import validateRequest from "../../shared/middlewares/validateRequest.js";
import { SubCategoryValidation } from "./subCategory.validation.js";
import { SubCategoryController } from "./subCategory.controller.js";

const router: Router = Router();

router.post(
  "/",
  validateRequest(SubCategoryValidation.createSubCategoryZodSchema),
  SubCategoryController.createSubCategory,
);

router.get("/", SubCategoryController.getAllSubCategories);
router.get("/:id", SubCategoryController.getSingleSubCategory);

router.patch(
  "/:id",
  validateRequest(SubCategoryValidation.updateSubCategoryZodSchema),
  SubCategoryController.updateSubCategory,
);

router.delete("/:id", SubCategoryController.deleteSubCategory);

export const SubCategoryRoutes: Router = router;
