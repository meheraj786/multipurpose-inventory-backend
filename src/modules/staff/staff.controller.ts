import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { StaffService } from "./staff.service.js";

const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const adminUserId = req.user?.userId as string;

    const result = await StaffService.createStaff(req.body, accountId, adminUserId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Staff member created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await StaffService.getAllStaff(accountId, page, limit, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff members fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;

    const result = await StaffService.getSingleStaff(id, accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff member fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const adminUserId = req.user?.userId as string;

    const result = await StaffService.updateStaff(id, accountId, req.body, adminUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff member updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const accountId = req.user?.accountId as string;
    const adminUserId = req.user?.userId as string;

    const result = await StaffService.deleteStaff(id, accountId, adminUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff member deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const StaffController = {
  createStaff,
  getAllStaff,
  getSingleStaff,
  updateStaff,
  deleteStaff,
};
