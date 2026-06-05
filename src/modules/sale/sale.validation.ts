import { z } from "zod";
import { PaymentMethod } from "../../generated/prisma/index.js";

const paymentEntrySchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().min(0, "Amount must be non-negative"),
  transactionId: z.string().optional(),
});

export const createSaleZodSchema = z.object({
  body: z.object({
    customerId: z
      .string()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    customerNumber: z.string().optional(),

    paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),

    payments: z.array(paymentEntrySchema).optional(),

    discount: z.number().min(0).default(0),
    due: z.number().min(0).default(0),

    saleItems: z
      .array(
        z.object({
          productId: z.string().min(1),
          unitId: z.string().optional(),
          quantity: z.number().min(0.0001),
          sellPrice: z.number().min(0),
          discount: z.number().min(0).default(0),
        }),
      )
      .default([]),

    saleServices: z
      .array(
        z.object({
          serviceId: z.string().min(1),
          quantity: z.number().int().min(1),
          unitPrice: z.number().min(0),
          discount: z.number().min(0).default(0),
        }),
      )
      .default([]),
  }),
});

export const updateSaleZodSchema = z.object({
  body: z
    .object({
      customerId: z.string().optional(),
      customerNumber: z.string().optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
      payments: z.array(paymentEntrySchema).optional(),
      discount: z.number().min(0).optional(),
      due: z.number().min(0).optional(),
      saleItems: z
        .array(
          z.object({
            productId: z.string().min(1),
            unitId: z.string().optional(),
            quantity: z.number().min(0.0001),
            sellPrice: z.number().min(0),
            discount: z.number().min(0).default(0),
          }),
        )
        .optional(),
      saleServices: z
        .array(
          z.object({
            serviceId: z.string().min(1),
            quantity: z.number().int().min(1),
            unitPrice: z.number().min(0),
            discount: z.number().min(0).default(0),
          }),
        )
        .optional(),
    })
    .strict(),
});

export type CreateSaleInput = z.infer<typeof createSaleZodSchema>["body"];
export type UpdateSaleInput = z.infer<typeof updateSaleZodSchema>["body"];

export const SaleValidation = {
  createSaleZodSchema,
  updateSaleZodSchema,
};