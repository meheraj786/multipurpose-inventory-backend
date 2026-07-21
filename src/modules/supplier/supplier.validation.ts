import { z } from "zod";

const createSupplierZodSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Name is required"),
		contact: z.string().min(1, "Contact is required"),
		email: z.string().email("Invalid email").optional().or(z.literal("")),
		companyName: z.string().optional().or(z.literal("")),
		address: z.string().optional().or(z.literal("")),
	}),
});

const updateSupplierZodSchema = z.object({
	body: z.object({
		name: z.string().min(1).optional(),
		contact: z.string().min(1).optional(),
		email: z.string().email("Invalid email").optional().or(z.literal("")),
		companyName: z.string().optional().or(z.literal("")),
		address: z.string().optional().or(z.literal("")),
	}),
});

export const SupplierValidation = {
	createSupplierZodSchema,
	updateSupplierZodSchema,
};