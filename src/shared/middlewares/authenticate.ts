import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../modules/auth/auth.utils.js";
import type { JwtPayload } from "../../modules/auth/auth.utils.js";
import prisma from "../utils/prisma.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Read access token from cookie
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decoded = verifyAccessToken(token);

    // DEVELOPER has no accountId — skip account check
    if (decoded.role !== "DEVELOPER") {
      const account = await prisma.account.findFirst({
        where: { id: decoded.accountId ?? "", isDeleted: false },
      });

      if (!account) {
        return res.status(403).json({ success: false, message: "Account not found" });
      }

      if (account.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: `Account is ${account.status.toLowerCase()}`,
        });
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
    }
    next();
  };
};
