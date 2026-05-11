import type { Request, Response, NextFunction } from "express";
import { CategoryService } from "./category.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CategoryService.createCategory(req.body);

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
    const { accountId } = req.query;
    const result = await CategoryService.getAllCategories(accountId as string);

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

export const CategoryController = {
  createCategory,
  getAllCategories,
};
