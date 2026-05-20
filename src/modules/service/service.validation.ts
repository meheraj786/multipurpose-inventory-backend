import { z } from "zod";

const createServiceZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    internalCost: z.number().min(0).optional().default(0),
    salePrice: z.number().min(0).default(0),
    description: z.string().optional(),
    categoryId: z.string(),
    subCategoryId: z.string().optional(),
  }),
});

const updateServiceZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    internalCost: z.number().min(0).optional(),
    salePrice: z.number().min(0).optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
  }),
});

export type CreateServiceInput = z.infer<typeof createServiceZodSchema>["body"];
export type UpdateServiceInput = z.infer<typeof updateServiceZodSchema>["body"];

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
