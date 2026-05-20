import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { SaleService } from "./sale.service.js";
import { InvoiceService } from "../invoice/invoice.service.js";

const createSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    // const userId = req.user?.userId as string;

    const sale = await SaleService.createSale(req.body, accountId);

    if (!sale) throw new Error("Failed to create sale");

    let total = 0;

    if (sale.saleItems?.length) {
      total += sale.saleItems.reduce((sum, item) => {
        return sum + Number(item.sellPrice) * item.quantity - Number(item.discount ?? 0);
      }, 0);
    }

    if (sale.saleServices?.length) {
      total += sale.saleServices.reduce((sum, service) => {
        return sum + Number(service.total);
      }, 0);
    }

    const grandTotal = Math.max(0, total - Number(sale.discount ?? 0));

    await InvoiceService.createInvoice(
      {
        billTo: sale.customer?.name ?? sale.customerNumber ?? "Walk-in Customer",
        invoiceDate: new Date().toISOString(),
        saleId: sale.id,
        status: "PENDING",
        grandTotal,
      },
      accountId,
    );

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
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await SaleService.getAllSales(accountId, page, limit, search);

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

const getSingleSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

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
    const accountId = req.user?.accountId as string;
    const { accountId: _, ...rest } = req.body;

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
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

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
