import { PaymentMethod, PurchasePaymentStatus } from "../../generated/prisma/index.js";
import { z } from "zod";

export const createPurchaseItemSchema = z.object({
  productId: z.string(),
  unitId: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0.0001, "Quantity must be greater than 0"),
  purchasePrice: z.coerce.number().min(0, "Price cannot be negative"),
  rate: z.coerce.number().optional(),
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
    qty: z.coerce.number().optional(),
    purchasePrice: z.coerce.number().optional(),
    rate: z.coerce.number().optional(),
    notes: z.string().nullable().optional(),
  }),
});

export const getPurchasesZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    paymentStatus: z.nativeEnum(PurchasePaymentStatus).optional(),
    dueOnly: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const recordPurchasePaymentZodSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    method: z.nativeEnum(PaymentMethod).optional(),
    note: z.string().nullable().optional(),
    paidAt: z.coerce.date().optional(),
  }),
});

export const getSupplierLedgerZodSchema = z.object({
  query: z.object({
    onlyUnpaid: z
      .string()
      .optional()
      .transform((v) => v === "true"),
  }),
});

export const PurchaseValidation = {
  createPurchaseZodSchema,
  updatePurchaseZodSchema,
  getPurchasesZodSchema,
  recordPurchasePaymentZodSchema,
  getSupplierLedgerZodSchema,
};

export type CreatePurchaseInput = z.infer<typeof createPurchaseZodSchema>["body"];
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseZodSchema>["body"];
export type RecordPurchasePaymentInput = z.infer<typeof recordPurchasePaymentZodSchema>["body"];
