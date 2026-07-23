import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { WastageService } from "./wastage.service.js";

const createWastage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await WastageService.createWastage(req.body, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Wastage recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllWastages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await WastageService.getAllWastages(accountId, page, limit, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Wastages fetched successfully",
      data: result.data.data, // ← Fixed
      meta: result.data.meta, // ← Fixed
    });
  } catch (error) {
    next(error);
  }
};

const getSingleWastage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await WastageService.getSingleWastage(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Wastage record fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateWastage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await WastageService.updateWastage(id, accountId, req.body, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Wastage record updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteWastage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await WastageService.deleteWastage(id, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Wastage record deleted and stock restored successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const WastageController = {
  createWastage,
  getAllWastages,
  getSingleWastage,
  updateWastage,
  deleteWastage,
};
