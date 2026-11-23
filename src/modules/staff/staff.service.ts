import bcrypt from "bcrypt";
import {
  type Prisma,
  type User,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type { CreateStaffInput, UpdateStaffInput } from "./staff.validation.js";

const ensureRoleBelongsToAccount = async (roleId: string | null | undefined, accountId: string) => {
  if (!roleId) return;
  const role = await prisma.role.findFirst({ where: { id: roleId, accountId } });
  if (!role) throw new Error("Role not found");
};

const createStaff = async (
  data: CreateStaffInput,
  accountId: string,
  adminUserId: string,
): Promise<Omit<User, "password">> => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already in use");

  const account = await prisma.account.findFirst({
    where: { id: accountId, isDeleted: false },
    include: { pricingPlan: true },
  });

  if (!account) throw new Error("Account not found");

  const userLimit = account.pricingPlan?.userLimit;
  if (userLimit !== null && userLimit !== undefined) {
    const currentStaffCount = await prisma.user.count({
      where: { accountId, role: "STAFF", isDeleted: false },
    });

    if (currentStaffCount >= userLimit) {
      throw new Error(`Your plan allows a maximum of ${userLimit} staff members`);
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  await ensureRoleBelongsToAccount(data.customRoleId, accountId);

  const staff = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      accountId,
      role: "STAFF",
      customRoleId: data.customRoleId ?? null,
    },
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.CREATE,
    details: `Created staff member: ${staff.email}`,
    accountId,
  });

  return staff;
};

const getAllStaff = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    accountId,
    role: "STAFF",
    isDeleted: false,
    ...(search && {
      OR: [{ email: { contains: search, mode: "insensitive" } }],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      omit: { password: true },
      include: {
        customRole: {
          include: { permissions: { orderBy: { module: "asc" } } },
        },
      },
    }),
    prisma.user.count({ where }),
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

const getSingleStaff = async (id: string, accountId: string) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
    omit: { password: true },
    include: {
      customRole: {
        include: { permissions: { orderBy: { module: "asc" } } },
      },
    },
  });

  if (!staff) throw new Error("Staff member not found");
  return staff;
};

const updateStaff = async (
  id: string,
  accountId: string,
  data: UpdateStaffInput,
  adminUserId: string,
) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
  });

  if (!staff) throw new Error("Staff member not found");

  const { customRoleId, ...staffData } = data;
  const updateData: Prisma.UserUpdateInput = { ...staffData };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }
  if (customRoleId !== undefined) {
    await ensureRoleBelongsToAccount(customRoleId, accountId);
    updateData.customRole = customRoleId ? { connect: { id: customRoleId } } : { disconnect: true };
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.UPDATE,
    details: `Updated staff member: ${staff.email}`,
    accountId,
  });

  return updated;
};

const deleteStaff = async (id: string, accountId: string, adminUserId: string) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
  });

  if (!staff) throw new Error("Staff member not found");

  const result = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.DELETE,
    details: `Deleted staff member: ${staff.email}`,
    accountId,
  });

  return result;
};
export const StaffService = {
  createStaff,
  getAllStaff,
  getSingleStaff,
  updateStaff,
  deleteStaff,
};
