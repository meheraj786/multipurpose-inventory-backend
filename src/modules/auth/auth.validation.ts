import { z } from "zod";

const registerZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    companyName: z.string().min(2),
    category: z.string(),
    type: z.string(),
    model: z.enum(["RETAIL", "SERVICE", "RESTAURANT"]),
    currency: z.enum(["USD", "BDT", "EUR", "GBP"]).optional().default("USD"),
    pricingPlanId: z.string().optional(),
  }),
});

const loginZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshTokenZodSchema = z.object({
  cookies: z.object({
    refreshToken: z.string(),
  }),
});

export type RegisterInput = z.infer<typeof registerZodSchema>["body"];
export type LoginInput = z.infer<typeof loginZodSchema>["body"];

export const AuthValidation = {
  registerZodSchema,
  loginZodSchema,
  refreshTokenZodSchema,
};
