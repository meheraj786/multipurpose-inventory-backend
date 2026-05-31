import { z } from "zod";

const createProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    sku: z.string().optional(),
    tax: z.number().min(0).optional(),
    defaultPurchasePrice: z.number().min(0).optional(),
    defaultSalePrice: z.number().min(0).optional(),
    lowStockAlert: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    subCategoryId: z.string().optional(),
    img: z.string().optional(),
  }),
});

const updateProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    tax: z.number().min(0).optional(),
    defaultPurchasePrice: z.number().min(0).optional(),
    defaultSalePrice: z.number().min(0).optional(),
    lowStockAlert: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    img: z.string().optional(),
  }),
});

const stockInZodSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    purchasePrice: z.number().min(0, "Purchase price cannot be negative"),
    rate: z.number().min(0, "Rate cannot be negative"),
    supplierId: z.string().optional(),
    purchaseId: z.string().optional(),
    batch: z.string().optional(),
  }),
});

export type StockInInput = z.infer<typeof stockInZodSchema>["body"];


export type CreateProductInput = z.infer<typeof createProductZodSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductZodSchema>["body"];

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
  stockInZodSchema
};