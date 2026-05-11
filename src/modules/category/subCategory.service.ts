import type { SubCategory } from "@/generated/prisma/client.js";
import type { CreateSubCategoryInput, UpdateSubCategoryInput } from "./subCategory.validation.js";
import { prisma } from "@/config/database.js";

const createSubCategory = async (data: CreateSubCategoryInput): Promise<SubCategory> => {
  const result = await prisma.subCategory.create({
    data,
  });
  return result;
};

const getAllSubCategories = async (accountId: string): Promise<SubCategory[]> => {
  return await prisma.subCategory.findMany({
    where: {
      accountId,
      isDeleted: false,
    },
    include: {
      category: true,
    },
  });
};

const updateSubCategory = async (
  id: string,
  accountId: string,
  payload: UpdateSubCategoryInput,
): Promise<SubCategory | null> => {
  return await prisma.subCategory.update({
    where: {
      id,
      accountId,
    },
    data: payload,
  });
};

export const SubCategoryService = {
  createSubCategory,
  getAllSubCategories,
  updateSubCategory,
};
