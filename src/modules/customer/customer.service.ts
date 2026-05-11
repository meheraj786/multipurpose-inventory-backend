import {
  type Customer,
  type Prisma,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customer.validation.js";

const createCustomer = async (data: CreateCustomerInput): Promise<Customer> => {
  return await prisma.customer.create({ data });
};

const getAllCustomers = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
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

const getSingleCustomer = async (id: string, accountId: string) => {
  return await prisma.customer.findFirst({
    where: { id, accountId, isDeleted: false },
  });
};

const updateCustomer = async (
  id: string,
  accountId: string,
  data: UpdateCustomerInput,
): Promise<Customer> => {
  return await prisma.customer.update({
    where: { id, accountId },
    data,
  });
};

const deleteCustomer = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const customer = await tx.customer.findUnique({ where: { id } });
    if (!customer || customer.accountId !== accountId) {
      throw new Error("Customer not found");
    }

    const result = await tx.customer.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.CUSTOMER,
      itemName: customer.name,
      itemId: customer.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.CUSTOMER,
      action: SystemAction.DELETE,
      details: `Deleted customer: ${customer.name}`,
      accountId,
    });

    return result;
  });
};

export const CustomerService = {
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};