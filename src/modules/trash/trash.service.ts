import type { Prisma } from ".././../generated/prisma/client.js";
import { SystemAction, type SystemModule } from "../../generated/prisma/enums.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";

const getTrashByAccount = async (accountId: string) => {
  return await prisma.trash.findMany({
    where: { accountId },
    orderBy: { date: "desc" },
  });
};

const restoreItem = async (
  trashId: string,
  accountId: string,
  userId: string,
) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const trashItem = await tx.trash.findUnique({ where: { id: trashId } });
    if (!trashItem || trashItem.accountId !== accountId) {
      throw new Error("Item not found in trash");
    }

    const modelMap: Record<SystemModule, keyof Prisma.TransactionClient> = {
      USER: "user",
      CATEGORY: "category",
      SUBCATEGORY: "subCategory",
      PRODUCT: "product",
      SUPPLIER: "supplier",
      CUSTOMER: "customer",
      SALE: "sale",
      PURCHASE: "purchase",
      INVENTORY: "inventory",
      WASTE: "waste",
      TRASH: "trash",
      ACTIVITY_LOG: "activityLog",
      AUTH: "user",
    } as const;

    const prismaModelName = modelMap[trashItem.moduleName];

    if (!prismaModelName) {
      throw new Error(`No model mapping found for: ${trashItem.moduleName}`);
    }

    const model = tx[prismaModelName] as unknown as {
      update: (args: {
        where: { id: string };
        data: { isDeleted: boolean };
      }) => Promise<unknown>;
    };

    await model.update({
      where: { id: trashItem.itemId },
      data: { isDeleted: false },
    });

    await tx.trash.delete({ where: { id: trashId } });

    await ActivityLogService.createLog({
      userId,
      module: trashItem.moduleName,
      action: SystemAction.RESTORE,
      details: `Restored ${trashItem.moduleName}: ${trashItem.itemName}`,
      accountId,
    });

    return { message: "Item restored successfully" };
  });
};

const permanentDelete = async (trashId: string, accountId: string) => {
  return await prisma.trash.delete({
    where: { id: trashId, accountId },
  });
};

export const TrashService = {
  getTrashByAccount,
  restoreItem,
  permanentDelete,
};
