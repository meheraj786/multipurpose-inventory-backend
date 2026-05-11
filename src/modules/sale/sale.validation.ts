import { z } from "zod";

const FeatureNameEnum = z.enum(["RETAIL", "SERVICE", "RESTAURANT"]);
const PaymentMethodEnum = z.enum(["CASH", "CARD", "MOBILE_BANKING", "CREDIT"]);

const createSaleZodSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).optional().default([]),
    customerId: z.string().optional(),
    customerNumber: z.string().optional(),
    quantity: z.number().int().min(1),
    paymentMethod: PaymentMethodEnum,
    serviceId: z.string().optional(),
    purchasePrice: z.number().positive(),
    sellPrice: z.number().positive(),
    featureNames: z.array(FeatureNameEnum).min(1),
    discount: z.number().optional(),
    due: z.number().optional(),
    accountId: z.string(),
  }),
});

const updateSaleZodSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).optional(),
    customerId: z.string().optional(),
    customerNumber: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    paymentMethod: PaymentMethodEnum.optional(),
    serviceId: z.string().optional(),
    purchasePrice: z.number().positive().optional(),
    sellPrice: z.number().positive().optional(),
    featureNames: z.array(FeatureNameEnum).min(1).optional(),
    discount: z.number().optional(),
    due: z.number().optional(),
    accountId: z.string(),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleZodSchema>["body"];
export type UpdateSaleInput = z.infer<typeof updateSaleZodSchema>["body"];

export const SaleValidation = {
  createSaleZodSchema,
  updateSaleZodSchema,
};