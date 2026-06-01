import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { UnitService } from "./unit.service.js";
import type { UnitGroup } from "../../generated/prisma/index.js";

const getAllUnits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = req.query.group as UnitGroup | undefined;
    const result = await UnitService.getAllUnits(group);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Units fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUnitsByGroup = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await UnitService.getUnitsByGroup();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Units by group fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await UnitService.createUnit(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Unit created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const result = await UnitService.updateUnit(id as string, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Unit updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCompatibleUnits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unitId = req.params.id;
    const result = await UnitService.getCompatibleUnits(unitId as string);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Compatible units fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const UnitController = {
  getAllUnits,
  getUnitsByGroup,
  createUnit,
  updateUnit,
  getCompatibleUnits,
};
