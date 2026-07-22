import { z } from "zod";

const returnItemZodSchema = z.object({
	itemType: z.enum(["PRODUCT", "PREPARED_PRODUCT"]),
	productId: z.string().optional(),
	preparedProductId: z.string().optional(),
	quantity: z.number().positive("Quantity must be positive"),
});

const createCustomerReturnZodSchema = z.object({
	body: z.object({
		saleId: z.string().min(1, "Sale ID is required"),
		items: z.array(returnItemZodSchema).min(1, "At least one item is required"),
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