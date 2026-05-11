import type { Request, Response, NextFunction } from "express";
import { CategoryService } from "./category.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";
import { CategoryValidation } from "./category.validation.js";

const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CategoryValidation.createCategoryZodSchema.parse(req.body);
    const result = await CategoryService.createCategory(parsed.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Category created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.query.accountId as string;

    const result = await CategoryService.getAllCategories(accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Categories fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.query.accountId as string;

    const result = await CategoryService.getSingleCategory(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsed = CategoryValidation.updateCategoryZodSchema.parse(req.body);
    const accountId = parsed.body.accountId as string;

    const result = await CategoryService.updateCategory(id, accountId as string, parsed.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.body.accountId as string;
    const userId = req.body.userId as string;

    const result = await CategoryService.deleteCategory(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
