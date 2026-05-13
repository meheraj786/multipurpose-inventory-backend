import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { AuthService } from "./auth.service.js";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "./auth.utils.js";

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.register(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Registration successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken, refreshToken, user } = await AuthService.login(req.body);

    setRefreshTokenCookie(res, refreshToken);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Login successful",
      data: { accessToken, user },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new Error("Refresh token missing");

    const { accessToken, refreshToken } = await AuthService.refreshToken(token);

    setRefreshTokenCookie(res, refreshToken);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Token refreshed",
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    clearRefreshTokenCookie(res);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Logged out successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId as string;
    const result = await AuthService.getMe(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const AuthController = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
