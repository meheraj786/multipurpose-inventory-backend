import type { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { SystemAction, SystemModule } from "../../generated/prisma/index.js";

const METHOD_ACTION_MAP: Record<string, SystemAction> = {
  GET: "READ",
  POST: "CREATE",
  PATCH: "UPDATE",
  PUT: "UPDATE",
  DELETE: "DELETE",
};

export const checkPermission = (module: SystemModule) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (user.role === "DEVELOPER") return next();

      const account = await prisma.account.findFirst({
        where: { id: user.accountId ?? "", isDeleted: false },
        include: { pricingPlan: true },
      });

      if (!account) {
        return res.status(403).json({ success: false, message: "Account not found" });
      }

      if (account.status !== "ACTIVE") {
        return res.status(403).json({ success: false, message: "Account is not active" });
      }

      if (account.subsExpiryDate && account.subsExpiryDate < new Date()) {
        return res.status(403).json({
          success: false,
          message: "Your subscription has expired",
        });
      }

      if (!account.pricingPlan) {
        return res.status(403).json({
          success: false,
          message: "No active pricing plan found for this account",
        });
      }

      if (!account.pricingPlan.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your pricing plan is no longer active",
        });
      }

      if (!account.pricingPlan.allowedModules.includes(module)) {
        return res.status(403).json({
          success: false,
          message: `Your plan does not include access to ${module}`,
        });
      }

      if (user.role === "ADMIN") return next();

      const action = METHOD_ACTION_MAP[req.method] as SystemAction;
      if (!action) {
        return res.status(403).json({ success: false, message: "Unknown HTTP method" });
      }

      const permission = await prisma.permission.findUnique({
        where: { userId_module: { userId: user.userId, module } },
      });

      if (!permission) {
        return res.status(403).json({
          success: false,
          message: `You do not have access to ${module}`,
        });
      }

      if (!permission.actions.includes(action)) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${action} in ${module}`,
        });
      }

      next();
    } catch {
      return res.status(500).json({ success: false, message: "Permission check failed" });
    }
  };
};
