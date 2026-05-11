import { z } from "zod";

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().optional(),
    accountId: z.string(),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategoryZodSchema>["body"];

export const CategoryValidation = { createCategoryZodSchema };
