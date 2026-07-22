import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { CustomerReturnService } from "./customerReturn.service.js";

const createCustomerReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await CustomerReturnService.createCustomerReturn(req.body, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Customer return processed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await CustomerReturnService.getAllReturns(accountId, page, limit, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer returns fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await CustomerReturnService.getSingleReturn(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer return record fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await CustomerReturnService.updateReturn(id, accountId, req.body, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer return record updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await CustomerReturnService.deleteReturn(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer return record deleted and stock updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const CustomerReturnController = {
  createCustomerReturn,
  getAllReturns,
  getSingleReturn,
  updateReturn,
  deleteReturn,
};
