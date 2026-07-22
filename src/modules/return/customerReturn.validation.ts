import { z } from "zod";

const createCustomerReturnZodSchema = z.object({
  body: z.object({
    saleId: z.string().min(1, "Sale ID is required"),
    itemType: z.enum(["PRODUCT", "PREPARED_PRODUCT"]),
    productId: z.string().optional(),
    preparedProductId: z.string().optional(),
    quantity: z.number().positive("Quantity must be positive"),
    refundAmount: z.number().min(0, "Refund amount cannot be negative"),
    restocked: z.boolean().optional(),
    reason: z.string().optional(),
  }),
});

const updateCustomerReturnZodSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

export type CreateCustomerReturnInput = z.infer<typeof createCustomerReturnZodSchema>["body"];
export type UpdateCustomerReturnInput = z.infer<typeof updateCustomerReturnZodSchema>["body"];

export const CustomerReturnValidation = {
  createCustomerReturnZodSchema,
  updateCustomerReturnZodSchema,
};
