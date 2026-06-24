import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { RawProductService } from "./rawProduct.service.js";

const createRawProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const result = await RawProductService.createRawProduct(req.body, accountId, userId);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Raw product created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRawProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const subCategoryId = req.query.subCategoryId as string | undefined;

    const result = await RawProductService.getAllRawProducts(
      accountId,
      page,
      limit,
      search,
      categoryId,
      subCategoryId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Raw products fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleRawProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const result = await RawProductService.getSingleRawProduct(id, accountId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Raw product fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateRawProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const { accountId: _, ...rest } = req.body;
    const result = await RawProductService.updateRawProduct(id, accountId, rest, userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Raw product updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteRawProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const result = await RawProductService.deleteRawProduct(id, accountId, userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Raw product moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const stockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawProductId = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const result = await RawProductService.stockIn(rawProductId, accountId, userId, req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Stock added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const RawProductController = {
  createRawProduct,
  getAllRawProducts,
  getSingleRawProduct,
  updateRawProduct,
  deleteRawProduct,
  stockIn,
};
