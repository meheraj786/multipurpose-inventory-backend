import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { InvoiceService } from "./invoice.service.js";

const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await InvoiceService.createInvoice(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Invoice created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accountId = req?.user?.accountId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await InvoiceService.getAllInvoices(
      accountId,
      page,
      limit,
      search,
      status,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoices fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;

    const result = await InvoiceService.getSingleInvoice(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { accountId, ...rest } = req.body;

    const result = await InvoiceService.updateInvoice(id, accountId, rest);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req?.user?.accountId as string;
    const userId = req.body.userId as string;

    const result = await InvoiceService.deleteInvoice(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const InvoiceController = {
  createInvoice,
  getAllInvoices,
  getSingleInvoice,
  updateInvoice,
  deleteInvoice,
};
