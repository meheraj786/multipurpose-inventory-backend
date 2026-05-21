import {
  type Prisma,
  SystemAction,
  SystemModule,
  type SubCategory,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { TrashService } from "../trash/trash.service.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type { CreateSubCategoryInput, UpdateSubCategoryInput } from "./subCategory.validation.js";

const createSubCategory = async (
  data: CreateSubCategoryInput,
  accountId: string,
  userId: string,
): Promise<SubCategory> => {
  const subCategory = await prisma.subCategory.create({ data: { ...data, accountId } });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SUBCATEGORY,
    action: SystemAction.CREATE,
    details: `Created sub-category: ${subCategory.name}`,
    accountId,
  });

  return subCategory;
};

const getAllSubCategories = async (accountId: string) => {
  return await prisma.subCategory.findMany({
    where: { accountId, isDeleted: false },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
};

const getSingleSubCategory = async (id: string, accountId: string) => {
  return await prisma.subCategory.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { category: true },
  });
};

const updateSubCategory = async (
  id: string,
  accountId: string,
  payload: UpdateSubCategoryInput,
  userId: string,
): Promise<SubCategory> => {
  const subCategory = await prisma.subCategory.update({
    where: { id, accountId },
    data: payload,
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SUBCATEGORY,
    action: SystemAction.UPDATE,
    details: `Updated sub-category: ${subCategory.name}`,
    accountId,
  });

  return subCategory;
};

const deleteSubCategory = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const subCategory = await tx.subCategory.findUnique({ where: { id, accountId } });
    if (!subCategory) throw new Error("Sub-category not found");

    const result = await tx.subCategory.update({
      where: { id, accountId },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.SUBCATEGORY,
      itemName: subCategory.name,
      itemId: subCategory.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SUBCATEGORY,
      action: SystemAction.DELETE,
      details: `Deleted sub-category: ${subCategory.name}`,
      accountId,
    });

    return result;
  });
};

export const SubCategoryService = {
  createSubCategory,
  getAllSubCategories,
  getSingleSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
