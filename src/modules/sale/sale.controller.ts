import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { SaleService } from "./sale.service.js";
import { InvoiceService } from "../invoice/invoice.service.js";

const createSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await SaleService.createSale(req.body);

    await InvoiceService.createInvoice({
      billTo:
        req.body.customerNumber ?? req.body.customerId ?? "Walk-in Customer",
      invoiceDate: new Date().toISOString(),
      saleId: sale.id,
      status: "PENDING",
      grandTotal: Number(sale.sellPrice) - Number(sale.discount ?? 0),
      accountId: sale.accountId,
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Sale created successfully",
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.body.accountId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    const result = await SaleService.getAllSales(
      accountId,
      page,
      limit,
      search,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sales fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleSale = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const accountId = req.body.accountId as string;

    const result = await SaleService.getSingleSale(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sale fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { accountId, ...rest } = req.body;

    const result = await SaleService.updateSale(id, accountId, rest);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sale updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.body.accountId as string;
    const userId = req.body.userId as string;

    const result = await SaleService.deleteSale(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sale moved to trash successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const SaleController = {
  createSale,
  getAllSales,
  getSingleSale,
  updateSale,
  deleteSale,
};
