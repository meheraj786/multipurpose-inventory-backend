import {
  type Prisma,
  type Account,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type { CreateAccountInput, UpdateAccountInput } from "./account.validation.js";

const createAccount = async (data: CreateAccountInput, userId: string): Promise<Account> => {
  const account = await prisma.account.create({
    data: {
      ...data,
      subsDate: data.subsDate ? new Date(data.subsDate) : null,
      subsExpiryDate: data.subsExpiryDate ? new Date(data.subsExpiryDate) : null,
    },
    include: {
      pricingPlan: true,
    },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.ACCOUNT,
    action: SystemAction.CREATE,
    details: `Created account: ${account.companyName}`,
    accountId: account.id,
  });

  return account;
};

const getAccountDetails = async (id: string): Promise<Account> => {
  const account = await prisma.account.findFirst({
    where: { id, isDeleted: false },
    include: {
      pricingPlan: true,
      users: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  return account;
};

const updateAccount = async (
  id: string,
  data: UpdateAccountInput,
  userId: string,
): Promise<Account> => {
  const existing = await prisma.account.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Account not found");
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...data,
      subsDate: data.subsDate ? new Date(data.subsDate) : undefined,
      subsExpiryDate: data.subsExpiryDate ? new Date(data.subsExpiryDate) : undefined,
    },
    include: {
      pricingPlan: true,
    },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.ACCOUNT,
    action: SystemAction.UPDATE,
    details: `Updated account settings for: ${updated.companyName}`,
    accountId: id,
  });

  return updated;
};

const deleteAccount = async (id: string, userId: string): Promise<Account> => {
  const existing = await prisma.account.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Account not found");
  }

  const result = await prisma.account.update({
    where: { id },
    data: { isDeleted: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.ACCOUNT,
    action: SystemAction.DELETE,
    details: `Soft-deleted account: ${existing.companyName}`,
    accountId: id,
  });

  return result;
};

const getAllAccounts = async (page = 1, limit = 10, search?: string) => {
  const skip = (page - 1) * limit;

  const where: Prisma.AccountWhereInput = {
    isDeleted: false,
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.account.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        pricingPlan: true,
      },
    }),
    prisma.account.count({ where }),
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

export const AccountService = {
  createAccount,
  getAccountDetails,
  updateAccount,
  deleteAccount,
  getAllAccounts,
};
