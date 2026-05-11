import { type Category, SystemAction, SystemModule } from "@prisma/client";
import prisma from "../../shared/utils/prisma.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validation.js";
import type { Prisma } from "@/generated/prisma/client.js";
import { TrashService } from "../trash/trash.service.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";

const createCategory = async (data: CreateCategoryInput): Promise<Category> => {
  return await prisma.category.create({ data });
};

const getAllCategories = async (accountId: string) => {
  return await prisma.category.findMany({
    where: { accountId, isDeleted: false },
    include: { subCategories: true },
  });
};

const getSingleCategory = async (id: string, accountId: string) => {
  return await prisma.category.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { subCategories: true },
  });
};

const updateCategory = async (id: string, accountId: string, data: UpdateCategoryInput) => {
  return await prisma.category.update({
    where: { id, accountId },
    data,
  });
};

const deleteCategory = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const category = await tx.category.findUnique({ where: { id } });
    if (!category) throw new Error("Category not found");

    const result = await tx.category.update({
      where: { id, accountId },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.CATEGORY,
      itemName: category.name,
      itemId: category.id,
      deletedBy: userId,
      accountId: accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.CATEGORY,
      action: SystemAction.DELETE,
      details: `Deleted category: ${category.name}`,
      accountId,
    });

    return result;
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
