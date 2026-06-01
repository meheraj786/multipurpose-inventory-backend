import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { SupplierService } from "./supplier.service.js";

const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await SupplierService.createSupplier(req.body, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Supplier created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    const result = await SupplierService.getAllSuppliers(
      accountId,
      page,
      limit,
      search,
      categoryId,
      isActive,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Suppliers fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await SupplierService.getSingleSupplier(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Supplier fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const { accountId: _, ...rest } = req.body;

    const result = await SupplierService.updateSupplier(id, accountId, rest, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Supplier updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await SupplierService.deleteSupplier(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Supplier moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const toggleActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await SupplierService.toggleActive(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Supplier ${result.isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const SupplierController = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deleteSupplier,
  toggleActive,
};
