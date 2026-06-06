import type { ILogPayload } from "@/shared/shared.validation.js";
import type { ActivityLog, Prisma } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";

export type ActivityLogQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  module?: string;
  action?: string;
  userId?: string;
};

const createLog = async (data: ILogPayload): Promise<ActivityLog | null> => {
  if (!data.userId) {
    console.warn(`[ActivityLog] Skipped: userId is undefined for action ${data.action} on ${data.module}`);
    return null;
  }

  return await prisma.activityLog.create({
    data: {
      userId: data.userId,
      module: data.module,
      action: data.action,
      details: data.details,
      accountId: data.accountId,
    },
  });
};

const getLogsByAccount = async (accountId: string, query: ActivityLogQueryParams = {}) => {
  const { page = 1, pageSize = 20, search, module, action, userId } = query;

  const where: Prisma.ActivityLogWhereInput = {
    accountId,
    ...(search && {
      details: { contains: search, mode: "insensitive" },
    }),
    ...(module && { module: module as ActivityLog["module"] }),
    ...(action && { action: action as ActivityLog["action"] }),
    ...(userId && { userId }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: { dateTime: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: true },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { data, total, page, pageSize };
};

export const ActivityLogService = {
  createLog,
  getLogsByAccount,
};