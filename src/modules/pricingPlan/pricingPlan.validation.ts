import { z } from "zod";

const createPricingPlanZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    monthlyPrice: z.number().min(0),
    yearlyPrice: z.number().min(0),
    features: z.array(z.string()).min(1),
    isActive: z.boolean().optional().default(true),
  }),
});

const updatePricingPlanZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    monthlyPrice: z.number().min(0).optional(),
    yearlyPrice: z.number().min(0).optional(),
    features: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreatePricingPlanInput = z.infer<typeof createPricingPlanZodSchema>["body"];
export type UpdatePricingPlanInput = z.infer<typeof updatePricingPlanZodSchema>["body"];

export const PricingPlanValidation = {
  createPricingPlanZodSchema,
  updatePricingPlanZodSchema,
};
