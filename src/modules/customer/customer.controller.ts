import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { CustomerService } from "./customer.service.js";

const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CustomerService.createCustomer(
      req.body,
      req?.user?.accountId as string,
      req?.user?.userId as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Customer created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req?.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await CustomerService.getAllCustomers(accountId, page, pageSize, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customers fetched successfully",
      data: result.data,
      meta: {
        page: result.meta.page,
        limit: result.meta.pageSize,
        total: result.meta.total,
        totalPage: result.meta.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSingleCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;

    const result = await CustomerService.getSingleCustomer(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params.id as string;
  const accountId = req?.user?.accountId as string;

  const result = await CustomerService.updateCustomer(
    id,
    accountId,
    req.body,
    req?.user?.userId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer updated successfully",
    data: result,
  });
};

const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;
    const userId = req?.user?.userId as string;

    const result = await CustomerService.deleteCustomer(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const CustomerController = {
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};
