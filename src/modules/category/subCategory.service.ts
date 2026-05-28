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

export type SubCategoryQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  categoryId?: string; // filter by parent category
};

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

const getAllSubCategories = async (accountId: string, query: SubCategoryQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    categoryId,
  } = query;

  const allowedSortFields = ["name", "createdAt", "updatedAt"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const where: Prisma.SubCategoryWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(categoryId && { categoryId }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.subCategory.findMany({
      where,
      include: { category: true },
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.subCategory.count({ where }),
  ]);

  return { data, total, page, pageSize };
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
