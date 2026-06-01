import type { UnitGroup } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import type { CreateUnitInput, UpdateUnitInput } from "./unit.validation.js";

const getAllUnits = async (group?: UnitGroup) => {
  return prisma.unit.findMany({
    where: {
      isActive: true,
      ...(group && { group }),
    },
    orderBy: [{ group: "asc" }, { isBase: "desc" }, { name: "asc" }],
  });
};

const getUnitsByGroup = async () => {
  const units = await prisma.unit.findMany({
    where: { isActive: true },
    orderBy: [{ group: "asc" }, { isBase: "desc" }, { name: "asc" }],
  });

  return units.reduce(
    (acc, unit) => {
      if (!acc[unit.group]) acc[unit.group] = [];
      acc[unit.group].push(unit);
      return acc;
    },
    {} as Record<string, typeof units>,
  );
};

const createUnit = async (data: CreateUnitInput) => {
  const existing = await prisma.unit.findUnique({
    where: { symbol: data.symbol },
  });
  if (existing) throw new Error("Unit with this symbol already exists");

  return prisma.unit.create({ data });
};

const updateUnit = async (id: string, data: UpdateUnitInput) => {
  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) throw new Error("Unit not found");

  return prisma.unit.update({ where: { id }, data });
};

const convertQuantity = (quantity: number, fromFactor: number, toFactor: number): number => {
  // Convert to base then to target
  // e.g. 2 kg to g: 2 * 1000 / 1 = 2000g
  return (quantity * fromFactor) / toFactor;
};

const getCompatibleUnits = async (unitId: string) => {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error("Unit not found");

  return prisma.unit.findMany({
    where: { group: unit.group, isActive: true },
    orderBy: { conversionFactor: "asc" },
  });
};

export const UnitService = {
  getAllUnits,
  getUnitsByGroup,
  createUnit,
  updateUnit,
  convertQuantity,
  getCompatibleUnits,
};
