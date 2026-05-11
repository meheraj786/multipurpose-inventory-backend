import type { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";
import { SubCategoryService } from "./subCategory.service.js";

const createSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SubCategoryService.createSubCategory(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Sub-category created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSubCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.query;
    const result = await SubCategoryService.getAllSubCategories(accountId as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-categories fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const SubCategoryController = {
  createSubCategory,
  getAllSubCategories,
};
