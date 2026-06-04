import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { PurchaseService } from "./purchase.service.js";
import type { CreatePurchaseInput, UpdatePurchaseInput } from "./purchase.validation.js";

const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const body = req.body as CreatePurchaseInput;

    const result = await PurchaseService.createPurchases(body, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Purchase(s) created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await PurchaseService.getAllPurchases(accountId, page, limit, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchases fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSinglePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await PurchaseService.getSinglePurchase(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deletePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await PurchaseService.deletePurchase(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const body = req.body as UpdatePurchaseInput;

    const result = await PurchaseService.updatePurchase(id, accountId, userId, body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const PurchaseController = {
  createPurchase,
  getAllPurchases,
  getSinglePurchase,
  deletePurchase,
  updatePurchase,
};
