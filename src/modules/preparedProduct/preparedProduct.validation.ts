import { z } from "zod";

const preparedProductItemSchema = z.object({
  rawProductId: z.string().min(1, "Raw product is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
});

const createPreparedProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    unitId: z.string().min(1, "Unit is required"),
    categoryId: z.string().min(1, "Category is required"),
    subCategoryId: z.string().optional(),
    rawMaterialCost: z.number().min(0).optional(),
    defaultSalePrice: z.number().min(0).optional(),
    expiryDate: z.string().datetime().optional(),
    description: z.string().optional(),
    img: z.string().optional(),
    items: z
      .array(preparedProductItemSchema)
      .min(1, "Recipe must have at least one ingredient"),
  }),
});

const updatePreparedProductZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    unitId: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    rawMaterialCost: z.number().min(0).optional(),
    defaultSalePrice: z.number().min(0).optional(),
    expiryDate: z.string().datetime().optional(),
    description: z.string().optional(),
    img: z.string().optional(),
    items: z.array(preparedProductItemSchema).optional(),
  }),
});

export type PreparedProductItemInput = z.infer<typeof preparedProductItemSchema>;
export type CreatePreparedProductInput = z.infer<typeof createPreparedProductZodSchema>["body"];
export type UpdatePreparedProductInput = z.infer<typeof updatePreparedProductZodSchema>["body"];

export const PreparedProductValidation = {
  createPreparedProductZodSchema,
  updatePreparedProductZodSchema,
};