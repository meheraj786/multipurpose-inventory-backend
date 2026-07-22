import { z } from "zod";

const createWastageZodSchema = z.object({
	body: z.object({
		productId: z.string().optional(),
		rawProductId: z.string().optional(),
		preparedProductId: z.string().optional(),
		quantity: z.number().positive("Quantity must be positive"),
		reason: z.string().min(1, "Reason is required"),
		notes: z.string().optional(),
	}),
});

const updateWastageZodSchema = z.object({
	body: z.object({
		reason: z.string().min(1).optional(),
		notes: z.string().optional(),
	}),
});

export type CreateWastageInput = z.infer<typeof createWastageZodSchema>["body"];
export type UpdateWastageInput = z.infer<typeof updateWastageZodSchema>["body"];

export const WastageValidation = {
	createWastageZodSchema,
	updateWastageZodSchema,
};