import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { PurchasePaymentStatus } from "../../generated/prisma/index.js";
import { sendResponse } from "../../shared/utils/response.js";
import { PurchaseService } from "./purchase.service.js";
import type {
  CreatePurchaseInput,
  RecordPurchasePaymentInput,
  UpdatePurchaseInput,
} from "./purchase.validation.js";

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
    const paymentStatus = req.query.paymentStatus as PurchasePaymentStatus | undefined;

    const result = await PurchaseService.getAllPurchases(
      accountId,
      page,
      limit,
      search,
      paymentStatus,
    );

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

const restorePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await PurchaseService.restorePurchase(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase restored successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;
    const body = req.body as RecordPurchasePaymentInput;

    const result = await PurchaseService.recordPayment(id, accountId, userId, body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchasePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await PurchaseService.getPurchasePayments(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase payments fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getDueSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;

    const result = await PurchaseService.getDueSummary(accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Due summary fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSupplierDueSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;

    const result = await PurchaseService.getSupplierDueSummary(accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Supplier due summary fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSupplierPurchaseLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplierId = req.params.supplierId as string;
    const accountId = req.user?.accountId as string;
    const onlyUnpaid = req.query.onlyUnpaid === "true";

    const result = await PurchaseService.getSupplierPurchaseLedger(
      supplierId,
      accountId,
      onlyUnpaid,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Supplier purchase ledger fetched successfully",
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
  restorePurchase,
  recordPayment,
  getPurchasePayments,
  getDueSummary,
  getSupplierDueSummary,
  getSupplierPurchaseLedger,
};