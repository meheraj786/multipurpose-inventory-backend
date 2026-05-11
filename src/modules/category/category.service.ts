import prisma from "../../shared/utils/prisma.js";
import type { CreateCategoryInput } from "./category.validation.js";

const createCategory = async (data: CreateCategoryInput) => {
  return await prisma.category.create({ data });
};

const getAllCategories = async (accountId: string) => {
  return await prisma.category.findMany({
    where: { accountId, isDeleted: false },
    include: { subCategories: true },
  });
};

export const CategoryService = { createCategory, getAllCategories };
