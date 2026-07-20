import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { AccountService } from "./account.service.js";

const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId as string;

    const result = await AccountService.createAccount(req.body, userId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Account created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMyAccountDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;

    const result = await AccountService.getAccountDetails(accountId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account details fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await AccountService.getAccountDetails(id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account details fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateMyAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const result = await AccountService.updateAccount(accountId, req.body, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateSingleAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId as string;

    const result = await AccountService.updateAccount(id as string, req.body, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId as string;

    const result = await AccountService.deleteAccount(id as string, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await AccountService.getAllAccounts(page, limit, search);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Accounts fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const AccountController = {
  createAccount,
  getMyAccountDetails,
  getSingleAccount,
  updateMyAccount,
  updateSingleAccount,
  deleteAccount,
  getAllAccounts,
};