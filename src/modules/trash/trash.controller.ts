import type { Request, Response, NextFunction } from "express";
import { TrashService } from "./trash.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const getTrash = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId;
    const result = await TrashService.getTrashByAccount(accountId as string);
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
    const { accountId, userId } = req.body;
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

export const TrashController = { getTrash, restoreItem };
