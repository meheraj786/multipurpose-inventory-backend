import {
  type Invoice,
  type Prisma,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "./invoice.validation.js";

const createInvoice = async (data: CreateInvoiceInput, accountId: string): Promise<Invoice> => {
  return await prisma.invoice.create({
    data: {
      ...data,
      accountId,
      invoiceDate: new Date(data.invoiceDate),
    },
    include: { sale: true },
  });
};

const getAllInvoices = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {
    accountId,
    isDeleted: false,
    ...(status && { status: status as Invoice["status"] }),
    ...(search && {
      OR: [
        { billTo: { contains: search, mode: "insensitive" } },
        { sale: { customerNumber: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { sale: { include: { customer: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleInvoice = async (id: string, accountId: string) => {
  return await prisma.invoice.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { sale: { include: { customer: true } } },
  });
};

const updateInvoice = async (
  id: string,
  accountId: string,
  data: UpdateInvoiceInput,
): Promise<Invoice> => {
  return await prisma.invoice.update({
    where: { id, accountId },
    data: {
      ...data,
      ...(data.invoiceDate && { invoiceDate: new Date(data.invoiceDate) }),
    },
  });
};

const deleteInvoice = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.accountId !== accountId) {
      throw new Error("Invoice not found");
    }

    const result = await tx.invoice.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.INVOICE,
      itemName: `Invoice-${invoice.id}`,
      itemId: invoice.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.INVOICE,
      action: SystemAction.DELETE,
      details: `Deleted invoice: ${invoice.id}`,
      accountId,
    });

    return result;
  });
};

export const InvoiceService = {
  createInvoice,
  getAllInvoices,
  getSingleInvoice,
  updateInvoice,
  deleteInvoice,
};
