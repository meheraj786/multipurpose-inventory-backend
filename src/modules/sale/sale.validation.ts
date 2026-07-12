import { z } from "zod";
import { PaymentMethod } from "../../generated/prisma/index.js";

const paymentEntrySchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().min(0, "Amount must be non-negative"),
  transactionId: z.string().optional(),
});

const saleItemSchema = z
  .object({
    itemType: z.enum(["PRODUCT", "PREPARED_PRODUCT"]).default("PRODUCT"),
    productId: z.string().optional(),
    preparedProductId: z.string().optional(),
    unitId: z.string().optional(),
    quantity: z.number().min(0.0001),
    sellPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
  })
  .refine(
    (data) => (data.itemType === "PREPARED_PRODUCT" ? !!data.preparedProductId : !!data.productId),
    {
      message:
        "productId is required for PRODUCT items, preparedProductId is required for PREPARED_PRODUCT items",
      path: ["productId"],
    },
  );

const saleServiceItemSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
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

    saleItems: z.array(saleItemSchema).default([]),
    saleServices: z.array(saleServiceItemSchema).default([]),
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
      saleItems: z.array(saleItemSchema).optional(),
      saleServices: z.array(saleServiceItemSchema).optional(),
    })
    .strict(),
});

export type CreateSaleInput = z.infer<typeof createSaleZodSchema>["body"];
export type UpdateSaleInput = z.infer<typeof updateSaleZodSchema>["body"];

export const SaleValidation = {
  createSaleZodSchema,
  updateSaleZodSchema,
};
