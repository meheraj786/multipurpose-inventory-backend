import type { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";
import { SubCategoryService } from "./subCategory.service.js";

const createSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

const getAllSubCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accountId = req?.user?.accountId as string;
    const result = await SubCategoryService.getAllSubCategories(accountId);

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

const getSingleSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;

    const result = await SubCategoryService.getSingleSubCategory(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-category fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;

    const result = await SubCategoryService.updateSubCategory(
      id,
      accountId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-category updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { accountId, userId } = req.body;

    const result = await SubCategoryService.deleteSubCategory(
      id,
      accountId,
      userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sub-category moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const SubCategoryController = {
  createSubCategory,
  getAllSubCategories,
  getSingleSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
