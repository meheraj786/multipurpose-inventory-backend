import type { ActivityLog } from "../../generated/prisma/client.js";
// import {_SystemModule, _SystemAction} from "../../generated/prisma/enums.js";
import prisma from "../../shared/utils/prisma.js";
import type { ILogPayload } from "@/shared/shared.validation.js";

const createLog = async (data: ILogPayload): Promise<ActivityLog> => {
  return await prisma.activityLog.create({
    data,
  });
};

const getLogsByAccount = async (accountId: string): Promise<ActivityLog[]> => {
  return await prisma.activityLog.findMany({
    where: {
      accountId,
    },
  });
};

export const ActivityLogService = {
  createLog,
  getLogsByAccount,
};
