import { z } from "zod";

const createCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20),
    address: z.string().optional(),
    hasMembership: z.boolean().optional().default(false),
    accountId: z.string(),
  }),
});

const updateCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    address: z.string().optional(),
    hasMembership: z.boolean().optional(),
    accountId: z.string(),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerZodSchema>["body"];
export type UpdateCustomerInput = z.infer<typeof updateCustomerZodSchema>["body"];

export const CustomerValidation = {
  createCustomerZodSchema,
  updateCustomerZodSchema,
};