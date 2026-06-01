import { z } from "zod";

export const createPurchaseItemSchema = z.object({
  productId: z.string(),
  unitId: z.string().nullable().optional(),
  quantity: z.number(),
  purchasePrice: z.number(),
  rate: z.number().optional(),
  batch: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createPurchaseZodSchema = z.object({
  body: z.object({
    supplierId: z.string().nullable().optional(),
    items: z.array(createPurchaseItemSchema).min(1),
    notes: z.string().nullable().optional(),
  }),
});

export const updatePurchaseZodSchema = z.object({
  body: z.object({
    supplierId: z.string().nullable().optional(),
    qty: z.number().optional(),
    purchasePrice: z.number().optional(),
    rate: z.number().optional(),
    notes: z.string().nullable().optional(),
  }),
});

export const getPurchasesZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const PurchaseValidation = {
  createPurchaseZodSchema,
  updatePurchaseZodSchema,
  getPurchasesZodSchema,
};

export type CreatePurchaseInput = z.infer<
  typeof createPurchaseZodSchema
>["body"];

export type UpdatePurchaseInput = z.infer<
  typeof updatePurchaseZodSchema
>["body"];
