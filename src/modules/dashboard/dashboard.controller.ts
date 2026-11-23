import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { DashboardService } from "./dashboard.service.js";
import type { DateRangePreset } from "../../shared/utils/dateRange.js";
import prisma from "../../shared/utils/prisma.js";

const getReadableModules = async (req: Request) => {
  const user = req.user;
  if (!user) return new Set<string>();

  const account = await prisma.account.findFirst({
    where: { id: user.accountId ?? "", isDeleted: false },
    select: { pricingPlan: { select: { allowedModules: true } } },
  });
  const planModules = new Set(account?.pricingPlan?.allowedModules ?? []);
  if (user.role === "ADMIN" || user.role === "DEVELOPER") return planModules;

  const staff = await prisma.user.findFirst({
    where: {
      id: user.userId,
      accountId: user.accountId ?? "",
      role: "STAFF",
      isDeleted: false,
    },
    select: {
      customRole: {
        select: {
          accountId: true,
          permissions: { select: { module: true, actions: true } },
        },
      },
    },
  });

  if (staff?.customRole?.accountId !== user.accountId) return new Set<string>();
  return new Set(
    staff.customRole.permissions
      .filter(
        (permission) => permission.actions.includes("READ") && planModules.has(permission.module),
      )
      .map((permission) => permission.module),
  );
};

const VALID_RANGES: DateRangePreset[] = [
  "today",
  "week",
  "month",
  "last3months",
  "year",
  "all",
  "custom",
];

const parseRangeQuery = (req: Request) => {
  const rawRange = req.query.range as string | undefined;
  const range: DateRangePreset = VALID_RANGES.includes(rawRange as DateRangePreset)
    ? (rawRange as DateRangePreset)
    : "all";
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  return { range, customStart, customEnd, limit };
};

const getSalesOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd } = parseRangeQuery(req);

    const result = await DashboardService.getSalesOverview(
      accountId,
      range,
      customStart,
      customEnd,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Sales overview fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getOverviewStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd } = parseRangeQuery(req);

    const result = await DashboardService.getOverviewStats(
      accountId,
      range,
      customStart,
      customEnd,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Overview stats fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTopCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd, limit } = parseRangeQuery(req);

    const result = await DashboardService.getTopCustomers(
      accountId,
      range,
      customStart,
      customEnd,
      limit,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Top customers fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getDueRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd, limit } = parseRangeQuery(req);

    const result = await DashboardService.getDueRanking(
      accountId,
      range,
      customStart,
      customEnd,
      limit,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Due ranking fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd } = parseRangeQuery(req);

    const result = await DashboardService.getCategoryRanking(
      accountId,
      range,
      customStart,
      customEnd,
    );
    const readableModules = await getReadableModules(req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category ranking fetched successfully",
      data: {
        categories: readableModules.has("CATEGORY") ? result.categories : [],
        subCategories: readableModules.has("SUBCATEGORY") ? result.subCategories : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd, limit } = parseRangeQuery(req);

    const result = await DashboardService.getProductRanking(
      accountId,
      range,
      customStart,
      customEnd,
      limit,
    );
    const readableModules = await getReadableModules(req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Product ranking fetched successfully",
      data: {
        products: readableModules.has("PRODUCT") ? result.products : [],
        preparedProducts: readableModules.has("PREPARED_PRODUCT") ? result.preparedProducts : [],
        services: readableModules.has("SERVICE") ? result.services : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const readableModules = await getReadableModules(req);
    const result = await DashboardService.getLowStockAlert(
      accountId,
      readableModules.has("PRODUCT"),
      readableModules.has("RAW_PRODUCT"),
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Low stock alert fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTopSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd, limit } = parseRangeQuery(req);

    const result = await DashboardService.getTopSuppliers(
      accountId,
      range,
      customStart,
      customEnd,
      limit,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Top suppliers fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd } = parseRangeQuery(req);

    const result = await DashboardService.getPurchaseOverview(
      accountId,
      range,
      customStart,
      customEnd,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase overview fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const { range, customStart, customEnd } = parseRangeQuery(req);

    const result = await DashboardService.getPurchaseReport(
      accountId,
      range,
      customStart,
      customEnd,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase report fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const DashboardController = {
  getSalesOverview,
  getOverviewStats,
  getTopCustomers,
  getDueRanking,
  getCategoryRanking,
  getProductRanking,
  getLowStockAlert,
  getTopSuppliers,
  getPurchaseOverview,
  getPurchaseReport,
};
