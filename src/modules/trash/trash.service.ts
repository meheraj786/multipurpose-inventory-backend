import { type Prisma, SystemAction, type SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";

export type TrashQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  moduleName?: string;
};

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

const getTrashByAccount = async (accountId: string, query: TrashQueryParams = {}) => {
  const { page = 1, pageSize = 20, search, moduleName } = query;

  const where: Prisma.TrashWhereInput = {
    accountId,
    ...(search && { itemName: { contains: search, mode: "insensitive" } }),
    ...(moduleName && { moduleName: moduleName as SystemModule }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.trash.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trash.count({ where }),
  ]);

  return { data, total, page, pageSize };
};

const restoreItem = async (trashId: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const trashItem = await tx.trash.findUnique({ where: { id: trashId } });
    if (!trashItem || trashItem.accountId !== accountId) {
      throw new Error("Item not found in trash");
    }

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
    };

    const prismaModelName = modelMap[trashItem.moduleName];
    if (!prismaModelName) {
      throw new Error(`No model mapping found for: ${trashItem.moduleName}`);
    }

    const model = tx[prismaModelName] as unknown as {
      update: (args: { where: { id: string }; data: { isDeleted: boolean } }) => Promise<unknown>;
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
