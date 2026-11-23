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

export const getRequiredAction = (
  req: Pick<Request, "path" | "method">,
): SystemAction | undefined => {
  const routeParts = req.path.split("/").filter(Boolean);
  const routeAction = routeParts.at(-1);
  if (
    req.method === "POST" &&
    ["toggle-active", "pay-due", "payments"].includes(routeAction ?? "")
  ) {
    return "UPDATE";
  }
  if (routeAction === "stock-in") return "STOCK_IN";
  if (routeAction === "stock-out" || routeAction === "adjust") return "STOCK_OUT";
  if (routeAction === "produce") return "STOCK_IN";
  if (routeParts.includes("restore")) return "RESTORE";
  return METHOD_ACTION_MAP[req.method];
};

export const checkPermission = (
  module: SystemModule | SystemModule[],
  requiredAction?: SystemAction,
) => {
  const modules = Array.isArray(module) ? module : [module];

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

      const availableModules = modules.filter(
        (item) => item === "STAFF" || account.pricingPlan?.allowedModules.includes(item),
      );
      if (availableModules.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Your plan does not include access to ${modules.join(" or ")}`,
        });
      }

      if (user.role === "ADMIN") return next();

      const action = requiredAction ?? getRequiredAction(req);
      if (!action) {
        return res.status(403).json({ success: false, message: "Unknown HTTP method" });
      }

      const accountUser = await prisma.user.findFirst({
        where: {
          id: user.userId,
          accountId: user.accountId ?? "",
          isDeleted: false,
          role: "STAFF",
        },
        select: {
          customRole: {
            select: {
              accountId: true,
              permissions: {
                where: { module: { in: availableModules } },
                select: { actions: true },
              },
            },
          },
        },
      });

      const role = accountUser?.customRole;
      if (!role || role.accountId !== user.accountId) {
        return res.status(403).json({
          success: false,
          message: `You do not have a role with access to ${module}`,
        });
      }

      const hasPermission = role.permissions.some((permission) =>
        permission.actions.includes(action),
      );
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${action} in ${availableModules.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      req.log?.error({ error, module }, "Permission check failed");
      return res.status(500).json({ success: false, message: "Permission check failed" });
    }
  };
};
