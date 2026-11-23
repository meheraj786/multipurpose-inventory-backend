import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { ProductService } from "./product.service.js";

const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await ProductService.createProduct(req.body, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Product created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const subCategoryId = req.query.subCategoryId as string | undefined;

    const result = await ProductService.getAllProducts(
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
      message: "Products fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await ProductService.getSingleProduct(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Product fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getProductByBarcode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barcode = req.params.barcode as string;
    const accountId = req.user?.accountId as string;
    const result = await ProductService.getProductByBarcode(barcode, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result ? "Product fetched successfully" : "No product found for this barcode",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const { accountId: _, ...rest } = req.body;

    const result = await ProductService.updateProduct(id, accountId, rest, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await ProductService.deleteProduct(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Product moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const stockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await ProductService.stockIn(productId, accountId, userId, req.body);

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

const getStockSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await ProductService.getStockSummary(productId, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stock summary fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
  stockIn,
  getStockSummary,
};
