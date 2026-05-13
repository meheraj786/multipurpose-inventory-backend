import { type Prisma, SystemAction, type SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";

const addToTrash = async ({
  moduleName,
  itemName,
  itemId,
  deletedBy,
  accountId,
}: {
  moduleName: SystemModule;
  itemName: string;
  itemId: string;
  deletedBy: string;
  accountId: string;
}) => {
  return await prisma.trash.create({
    data: { moduleName, itemName, itemId, deletedBy, accountId },
  });
};

const getTrashByAccount = async (accountId: string) => {
  return await prisma.trash.findMany({
    where: { accountId },
    orderBy: { date: "desc" },
  });
};

const restoreItem = async (trashId: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const trashItem = await tx.trash.findUnique({ where: { id: trashId } });
    if (!trashItem || trashItem.accountId !== accountId) {
      throw new Error("Item not found in trash");
    }

    // Only map models that actually exist in the schema
    const modelMap: Partial<Record<SystemModule, keyof Prisma.TransactionClient>> = {
      USER: "user",
      ACCOUNT: "account",
      CATEGORY: "category",
      SUBCATEGORY: "subCategory",
      CUSTOMER: "customer",
      SALE: "sale",
      INVOICE: "invoice",
      PERMISSION: "permission",
      AUTH: "user",
      // PRODUCT, SUPPLIER, PURCHASE, INVENTORY, WASTE — add when those modules are built
    };

    const prismaModelName = modelMap[trashItem.moduleName];

    if (!prismaModelName) {
      throw new Error(
        `No model mapping found for: ${trashItem.moduleName} — module may not exist yet`,
      );
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
  addToTrash,
  getTrashByAccount,
  restoreItem,
  permanentDelete,
};