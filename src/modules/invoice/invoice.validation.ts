import { z } from "zod";

const InvoiceStatusEnum = z.enum(["PENDING", "PAID", "PARTIALLY_PAID", "CANCELLED"]);

const createInvoiceZodSchema = z.object({
  body: z.object({
    billTo: z.string().min(2),
    invoiceDate: z.string().datetime(),
    saleId: z.string(),
    status: InvoiceStatusEnum.optional().default("PENDING"),
    grandTotal: z.number().positive(),
  }),
});

const updateInvoiceZodSchema = z.object({
  body: z.object({
    billTo: z.string().min(2).optional(),
    invoiceDate: z.string().datetime().optional(),
    saleId: z.string().optional(),
    status: InvoiceStatusEnum.optional(),
    grandTotal: z.number().positive().optional(),
  }),
});

const payDueZodSchema = z.object({
  body: z.object({
    amountPaid: z.number().positive("Amount paid must be greater than 0"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceZodSchema>["body"];
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceZodSchema>["body"];
export type PayDueInput = z.infer<typeof payDueZodSchema>["body"];

export const InvoiceValidation = {
  createInvoiceZodSchema,
  updateInvoiceZodSchema,
  payDueZodSchema,
};
