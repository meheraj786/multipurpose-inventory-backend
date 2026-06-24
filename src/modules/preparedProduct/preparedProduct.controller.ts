import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { PreparedProductService } from "./preparedProduct.service.js";

const createPreparedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const result = await PreparedProductService.createPreparedProduct(
      req.body,
      accountId,
      userId,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Prepared product created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPreparedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;

    const result = await PreparedProductService.getAllPreparedProducts(
      accountId,
      page,
      limit,
      search,
      categoryId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prepared products fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSinglePreparedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const result = await PreparedProductService.getSinglePreparedProduct(
      id,
      accountId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prepared product fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePreparedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const { accountId: _, ...rest } = req.body;
    const result = await PreparedProductService.updatePreparedProduct(
      id,
      accountId,
      rest,
      userId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prepared product updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deletePreparedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const result = await PreparedProductService.deletePreparedProduct(
      id,
      accountId,
      userId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prepared product moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const produceStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      throw new Error("Quantity must be a positive number");
    }

    const result = await PreparedProductService.produceStock(
      id,
      accountId,
      userId,
      quantity,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Stock produced successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const PreparedProductController = {
  createPreparedProduct,
  getAllPreparedProducts,
  getSinglePreparedProduct,
  updatePreparedProduct,
  deletePreparedProduct,
  produceStock,
};