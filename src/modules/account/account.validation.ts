import { z } from "zod";
import { AccountModel, AccountStatus, Currency } from "../../generated/prisma/index.js";

const createAccountZodSchema = z.object({
  body: z.object({
    companyName: z.string().min(2).max(100),
    category: z.string().min(2).max(50),
    type: z.string().min(2).max(50),
    model: z.nativeEnum(AccountModel),
    logo: z.string().optional(),
    pricingPlanId: z.string().optional(),
    saleIdPrefix: z.string().optional(),
    footerNotes: z.string().optional(),
    digitalSignature: z.string().optional(),
    subsDate: z.string().datetime().optional(),
    subsExpiryDate: z.string().datetime().optional(),
    currency: z.nativeEnum(Currency).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
  }),
});

const updateAccountZodSchema = z.object({
  body: z.object({
    companyName: z.string().min(2).max(100).optional(),
    category: z.string().min(2).max(50).optional(),
    type: z.string().min(2).max(50).optional(),
    model: z.nativeEnum(AccountModel).optional(),
    logo: z.string().optional(),
    pricingPlanId: z.string().optional(),
    saleIdPrefix: z.string().optional(),
    footerNotes: z.string().optional(),
    digitalSignature: z.string().optional(),
    subsDate: z.string().datetime().optional(),
    subsExpiryDate: z.string().datetime().optional(),
    currency: z.nativeEnum(Currency).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
  }),
});

export type CreateAccountInput = z.infer<typeof createAccountZodSchema>["body"];
export type UpdateAccountInput = z.infer<typeof updateAccountZodSchema>["body"];

export const AccountValidation = {
  createAccountZodSchema,
  updateAccountZodSchema,
};