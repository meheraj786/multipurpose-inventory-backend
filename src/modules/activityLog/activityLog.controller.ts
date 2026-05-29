import type { Request, Response, NextFunction } from "express";
import { ActivityLogService } from "./activityLog.service.js";
import { sendResponse } from "../../shared/utils/response.js";
import httpStatus from "http-status";

const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;

    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      module: req.query.module as string | undefined,
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
    };

    const result = await ActivityLogService.getLogsByAccount(accountId, query);

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
