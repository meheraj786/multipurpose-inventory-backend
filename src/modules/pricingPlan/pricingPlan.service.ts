import {
  type PricingPlan,
  type Prisma,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type { CreatePricingPlanInput, UpdatePricingPlanInput } from "./pricingPlan.validation.js";

const createPricingPlan = async (
  data: CreatePricingPlanInput,
  _developerUserId: string,
): Promise<PricingPlan> => {
  const existing = await prisma.pricingPlan.findUnique({ where: { name: data.name } });
  if (existing) throw new Error("A plan with this name already exists");

  const plan = await prisma.pricingPlan.create({ data });

  // await ActivityLogService.createLog({
  //   userId: developerUserId,
  //   module: SystemModule.PRICING_PLAN,
  //   action: SystemAction.CREATE,
  //   details: `Created pricing plan: ${plan.name}`,
  //   accountId: data.accountId,
  // });

  return plan;
};

const getAllPricingPlans = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  isActive?: boolean,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.PricingPlanWhereInput = {
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(isActive !== undefined && { isActive }),
  };

  const [data, total] = await Promise.all([
    prisma.pricingPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingPlan.count({ where }),
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

const getSinglePricingPlan = async (id: string): Promise<PricingPlan> => {
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Pricing plan not found");
  return plan;
};

const updatePricingPlan = async (
  id: string,
  data: UpdatePricingPlanInput,
  // developerUserId: string,
): Promise<PricingPlan> => {
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Pricing plan not found");

  const updated = await prisma.pricingPlan.update({ where: { id }, data });

  // await ActivityLogService.createLog({
  //   userId: developerUserId,
  //   module: SystemModule.PRICING_PLAN,
  //   action: SystemAction.UPDATE,
  //   details: `Updated pricing plan: ${plan.name}`,
  //   accountId: "SYSTEM",
  // });

  return updated;
};

const toggleActive = async (id: string, developerUserId: string): Promise<PricingPlan> => {
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Pricing plan not found");

  const updated = await prisma.pricingPlan.update({
    where: { id },
    data: { isActive: !plan.isActive },
  });

  await ActivityLogService.createLog({
    userId: developerUserId,
    module: SystemModule.PRICING_PLAN,
    action: SystemAction.UPDATE,
    details: `${updated.isActive ? "Activated" : "Deactivated"} pricing plan: ${plan.name}`,
    accountId: "SYSTEM",
  });

  return updated;
};

const deletePricingPlan = async (id: string, developerUserId: string): Promise<PricingPlan> => {
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Pricing plan not found");

  const deleted = await prisma.pricingPlan.delete({ where: { id } });

  await ActivityLogService.createLog({
    userId: developerUserId,
    module: SystemModule.PRICING_PLAN,
    action: SystemAction.DELETE,
    details: `Deleted pricing plan: ${plan.name}`,
    accountId: "SYSTEM",
  });

  return deleted;
};

export const PricingPlanService = {
  createPricingPlan,
  getAllPricingPlans,
  getSinglePricingPlan,
  updatePricingPlan,
  toggleActive,
  deletePricingPlan,
};
