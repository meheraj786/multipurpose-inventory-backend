import { z } from "zod";

const InvoiceStatusEnum = z.enum(["PENDING", "PAID", "PARTIALLY_PAID", "CANCELLED"]);

const createInvoiceZodSchema = z.object({
  body: z.object({
    billTo: z.string().min(2),
    invoiceDate: z.string().datetime(),
    saleId: z.string(),
    status: InvoiceStatusEnum.optional().default("PENDING"),
    grandTotal: z.number().positive(),
    accountId: z.string(),
  }),
});

const updateInvoiceZodSchema = z.object({
  body: z.object({
    billTo: z.string().min(2).optional(),
    invoiceDate: z.string().datetime().optional(),
    saleId: z.string().optional(),
    status: InvoiceStatusEnum.optional(),
    grandTotal: z.number().positive().optional(),
    accountId: z.string(),
  }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceZodSchema>["body"];
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceZodSchema>["body"];

export const InvoiceValidation = {
  createInvoiceZodSchema,
  updateInvoiceZodSchema,
};
