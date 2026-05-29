import type { Request, Response, NextFunction } from "express";
import { TrashService } from "./trash.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const getTrash = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;

    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      moduleName: req.query.moduleName as string | undefined,
    };

    const result = await TrashService.getTrashByAccount(accountId, query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Trash items fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const restoreItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Fix: read from req.user, not req.body
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await TrashService.restoreItem(id as string, accountId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Item restored successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const permanentDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const accountId = req.user?.accountId as string;

    const result = await TrashService.permanentDelete(id as string, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Item permanently deleted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const TrashController = { getTrash, restoreItem, permanentDelete };
