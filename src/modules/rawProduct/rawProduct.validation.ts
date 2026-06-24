import { z } from "zod";

const createRawProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    unitId: z.string().min(1, "Unit is required"),
    description: z.string().optional(),
    img: z.string().optional(),
    lowStockAlert: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    subCategoryId: z.string().optional(),
  }),
});

const updateRawProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    unitId: z.string().optional(),
    description: z.string().optional(),
    img: z.string().optional(),
    lowStockAlert: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
  }),
});

const stockInZodSchema = z.object({
  body: z.object({
    quantity: z.number().positive("Quantity must be positive"),
    totalCost: z.number().min(0).optional(),
    supplierId: z.string().optional(),
    purchaseId: z.string().optional(),
    batch: z.string().optional(),
    lowStockAlert: z.string().optional(),
  }),
});

export type CreateRawProductInput = z.infer<typeof createRawProductZodSchema>["body"];
export type UpdateRawProductInput = z.infer<typeof updateRawProductZodSchema>["body"];
export type RawProductStockInInput = z.infer<typeof stockInZodSchema>["body"];

export const RawProductValidation = {
  createRawProductZodSchema,
  updateRawProductZodSchema,
  stockInZodSchema,
};