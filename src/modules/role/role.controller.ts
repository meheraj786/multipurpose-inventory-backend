import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { RoleService } from "./role.service.js";

const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RoleService.getAllRoles(req.user?.accountId as string);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roles fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RoleService.getSingleRole(
      req.params.id as string,
      req.user?.accountId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Role fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RoleService.createRole(
      req.body,
      req.user?.accountId as string,
      req.user?.userId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Role created successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RoleService.updateRole(
      req.params.id as string,
      req.user?.accountId as string,
      req.body,
      req.user?.userId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Role updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RoleService.deleteRole(
      req.params.id as string,
      req.user?.accountId as string,
      req.user?.userId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Role deleted successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const RoleController = {
  getAllRoles,
  getSingleRole,
  createRole,
  updateRole,
  deleteRole,
};
