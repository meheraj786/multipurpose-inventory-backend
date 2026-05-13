import type { ILogPayload } from "@/shared/shared.validation.js";
import type { ActivityLog } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";

const createLog = async (data: ILogPayload): Promise<ActivityLog> => {
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

const getLogsByAccount = async (accountId: string): Promise<ActivityLog[]> => {
  return await prisma.activityLog.findMany({
    where: { accountId },
    orderBy: { dateTime: "desc" },
  });
};

export const ActivityLogService = {
  createLog,
  getLogsByAccount,
};
