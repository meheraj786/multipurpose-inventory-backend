import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

export type JwtPayload = {
  userId: string;
  accountId: string | null;
  role: string;
  email: string;
};

export const generateAccessToken = (payload: JwtPayload): string => {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.verify(token, ACCESS_SECRET) as unknown as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.verify(token, REFRESH_SECRET) as unknown as JwtPayload;
};

export const setAccessTokenCookie = (res: import("express").Response, token: string) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
};

export const setRefreshTokenCookie = (res: import("express").Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookies = (res: import("express").Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};
