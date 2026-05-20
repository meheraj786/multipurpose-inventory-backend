import type { Request, Response, NextFunction } from "express";
import { ActivityLogService } from "./activityLog.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const  accountId  = req.user?.accountId;
    const result = await ActivityLogService.getLogsByAccount(accountId as string);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Activity logs fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const ActivityLogController = { getLogs };
