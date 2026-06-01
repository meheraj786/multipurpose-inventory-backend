import { z } from "zod";

const createSupplierZodSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    contact: z.string().min(1, "Contact is required"),
    email: z.string().email("Invalid email").optional(),
    companyName: z.string().optional(),
    address: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.boolean().default(true),
  }),
});

const updateSupplierZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    contact: z.string().optional(),
    email: z.string().email().optional(),
    companyName: z.string().optional(),
    address: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierZodSchema>["body"];
export type UpdateSupplierInput = z.infer<typeof updateSupplierZodSchema>["body"];

export const SupplierValidation = {
  createSupplierZodSchema,
  updateSupplierZodSchema,
};