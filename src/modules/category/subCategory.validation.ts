import { z } from "zod";

const createSubCategoryZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100),
    description: z.string().optional(),
    categoryId: z.string({ required_error: "Category ID is required" }).uuid(),
  }),
});

const updateSubCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional(),
  }),
});

export type CreateSubCategoryInput = z.infer<typeof createSubCategoryZodSchema>["body"];
export type UpdateSubCategoryInput = z.infer<typeof updateSubCategoryZodSchema>["body"];

export const SubCategoryValidation = {
  createSubCategoryZodSchema,
  updateSubCategoryZodSchema,
};
