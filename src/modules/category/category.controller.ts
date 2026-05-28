import type { Request, Response, NextFunction } from "express";
import { CategoryService } from "./category.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CategoryService.createCategory(
      req.body,
      req?.user?.accountId as string,
      req?.user?.userId as string,
    );

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
    const accountId = req?.user?.accountId as string;

    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
    };

    const result = await CategoryService.getAllCategories(accountId, query);

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
    const accountId = req?.user?.accountId as string;

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
    const accountId = req?.user?.accountId as string;

    const result = await CategoryService.updateCategory(
      id,
      accountId as string,
      req.body,
      req?.user?.userId as string,
    );

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
    const accountId = req?.user?.accountId as string;
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
