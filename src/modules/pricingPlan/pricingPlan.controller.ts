import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { PricingPlanService } from "./pricingPlan.service.js";

const createPricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const developerUserId = req.user?.userId as string;
    const result = await PricingPlanService.createPricingPlan(req.body, developerUserId);
    console.log(req.user);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Pricing plan created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPricingPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    const result = await PricingPlanService.getAllPricingPlans(page, limit, search, isActive);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pricing plans fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getSinglePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await PricingPlanService.getSinglePricingPlan(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pricing plan fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    console.log(id, "from update controller");

    // const developerUserId = req.user?.userId as string;

    const result = await PricingPlanService.updatePricingPlan(id as string, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pricing plan updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const toggleActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const developerUserId = req.user?.userId as string;
    const result = await PricingPlanService.toggleActive(id, developerUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Pricing plan ${result.isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deletePricingPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const developerUserId = req.user?.userId as string;
    const result = await PricingPlanService.deletePricingPlan(id, developerUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pricing plan deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const PricingPlanController = {
  createPricingPlan,
  getAllPricingPlans,
  getSinglePricingPlan,
  updatePricingPlan,
  toggleActive,
  deletePricingPlan,
};
