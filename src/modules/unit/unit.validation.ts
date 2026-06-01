import { z } from "zod";
import { UnitGroup } from "../../generated/prisma/index.js";

const createUnitZodSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    symbol: z.string().min(1).max(10),
    group: z.nativeEnum(UnitGroup),
    conversionFactor: z.number().positive(),
    isBase: z.boolean().default(false),
  }),
});

const updateUnitZodSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateUnitInput = z.infer<typeof createUnitZodSchema>["body"];
export type UpdateUnitInput = z.infer<typeof updateUnitZodSchema>["body"];

export const UnitValidation = {
  createUnitZodSchema,
  updateUnitZodSchema,
};
