import { z } from "zod";
import { PaymentMethod, FeatureName } from "../../generated/prisma/index.js";

export const createSaleZodSchema = z.object({
  body: z.object({
    customerId: z.string().optional().transform((val) => (val === "" ? undefined : val)),
    customerNumber: z.string().optional(),

    paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),

    discount: z.number().min(0).default(0),
    due: z.number().min(0).default(0),

    saleItems: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().min(1),
          purchasePrice: z.number().min(0),
          sellPrice: z.number().min(0),
          discount: z.number().min(0).default(0),
        }),
      )
      .min(0)
      .default([]),

    saleServices: z
      .array(
        z.object({
          serviceId: z.string(),
          quantity: z.number().int().min(1),
          unitPrice: z.number().min(0),
          discount: z.number().min(0).default(0),
        }),
      )
      .optional(),
  }),
});

export const updateSaleZodSchema = z.object({
  body: z
    .object({
      customerId: z.string().optional(),
      customerNumber: z.string().optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
      discount: z.number().min(0).optional(),
      due: z.number().min(0).optional(),

      productIds: z.array(z.string()).optional(),
      quantity: z.number().int().min(1).optional(),
      purchasePrice: z.number().optional(),
      sellPrice: z.number().optional(),
      featureNames: z.array(z.nativeEnum(FeatureName)).optional(),
    })
    .strict(),
});

export type CreateSaleInput = z.infer<typeof createSaleZodSchema>["body"];
export type UpdateSaleInput = z.infer<typeof updateSaleZodSchema>["body"];

export const SaleValidation = {
  createSaleZodSchema,
  updateSaleZodSchema,
};
