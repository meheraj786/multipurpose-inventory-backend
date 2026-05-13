import bcrypt from "bcrypt";
import prisma from "../../shared/utils/prisma.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "./auth.utils.js";

const register = async (data: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already registered");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        companyName: data.companyName,
        category: data.category,
        type: data.type,
        model: data.model,
        currency: data.currency,
      },
    });

    return newUser;
  });

  return { message: "Registration successful", userId: user.id };
};

const login = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email, isDeleted: false },
    include: { account: true },
  });

  if (!user) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");

  if (user.account?.status === "SUSPENDED") {
    throw new Error("Your account has been suspended");
  }

  const payload = {
    userId: user.id,
    accountId: user.account?.id ?? null,
    role: user.role,
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { accessToken, refreshToken, user: { ...payload, account: user.account } };
};

const refreshToken = async (token: string) => {
  const decoded = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId, isDeleted: false },
    include: { account: true },
  });

  if (!user) throw new Error("User not found");

  const payload = {
    userId: user.id,
    accountId: user.account?.id ?? null,
    role: user.role,
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  return { accessToken, refreshToken: newRefreshToken };
};

const getMe = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { account: true, permissions: true },
    omit: { password: true },
  });
};

export const AuthService = {
  register,
  login,
  refreshToken,
  getMe,
};
