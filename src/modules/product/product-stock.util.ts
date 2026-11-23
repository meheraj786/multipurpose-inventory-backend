import { Prisma, type Prisma as PrismaTypes } from "../../generated/prisma/index.js";

export type ProductStockAllocationInput = {
  productStockId: string;
  quantity: number;
  unitCost: number;
  saleQuantity?: number;
};

export type ProductStockConsumption = {
  totalCost: number;
  allocations: ProductStockAllocationInput[];
};

export type FifoStockLayer = {
  id: string;
  quantity: number | string | { toString(): string };
  purchasePrice: number | string | { toString(): string };
  unitConversionFactor?: number | string | { toString(): string };
};

export const planFifoStockAllocations = (
  stocks: FifoStockLayer[],
  quantity: number,
  saleUnitConversionFactor: number | string | { toString(): string } = 1,
) => {
  let remaining = new Prisma.Decimal(quantity);
  const saleUnitFactor = new Prisma.Decimal(saleUnitConversionFactor.toString());
  let totalCost = new Prisma.Decimal(0);
  const allocations: ProductStockAllocationInput[] = [];

  for (const stock of stocks) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const stockUnitFactor = new Prisma.Decimal(stock.unitConversionFactor?.toString() ?? "1");
    const stockQuantity = new Prisma.Decimal(stock.quantity.toString());
    const availableInSaleUnit = stockQuantity.mul(stockUnitFactor).div(saleUnitFactor);
    const saleQuantity =
      remaining.comparedTo(availableInSaleUnit) <= 0 ? remaining : availableInSaleUnit;
    if (saleQuantity.lessThanOrEqualTo(0)) continue;
    const allocated = saleQuantity.mul(saleUnitFactor).div(stockUnitFactor);

    const unitCost = new Prisma.Decimal(stock.purchasePrice.toString());
    allocations.push({
      productStockId: stock.id,
      quantity: allocated.toNumber(),
      unitCost: unitCost.toNumber(),
      saleQuantity: saleQuantity.toNumber(),
    });
    totalCost = totalCost.plus(new Prisma.Decimal(allocated).mul(unitCost));
    remaining = remaining.minus(saleQuantity);
  }

  return { allocations, remaining: remaining.toNumber(), totalCost: totalCost.toNumber() };
};

const MAX_STALE_RETRIES = 10;

const getProductAndSaleUnitFactor = async (
  tx: PrismaTypes.TransactionClient,
  productId: string,
  accountId: string,
  unitId?: string | null,
) => {
  const product = await tx.product.findFirst({
    where: { id: productId, accountId, isDeleted: false },
    include: { unit: { select: { group: true } } },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const saleUnit = await tx.unit.findUnique({
    where: { id: unitId ?? product.unitId },
    select: { id: true, group: true, conversionFactor: true },
  });
  if (!saleUnit) throw new Error("Sale unit not found");
  if (saleUnit.group !== product.unit.group) {
    throw new Error("Sale unit is incompatible with the product unit");
  }

  const factor = new Prisma.Decimal(saleUnit.conversionFactor.toString());
  if (factor.lessThanOrEqualTo(0)) throw new Error("Sale unit conversion factor must be positive");
  return { group: saleUnit.group, factor };
};

export const getAvailableProductStock = async (
  tx: PrismaTypes.TransactionClient,
  productId: string,
  accountId: string,
  unitId?: string | null,
) => {
  const saleUnit = await getProductAndSaleUnitFactor(tx, productId, accountId, unitId);
  const stocks = await tx.productStock.findMany({
    where: {
      productId,
      accountId,
      isDeleted: false,
      quantity: { gt: 0 },
    },
    include: { unit: { select: { group: true, conversionFactor: true } } },
  });

  return stocks
    .reduce((total, stock) => {
      if (stock.unit.group !== saleUnit.group) {
        throw new Error(`Stock batch ${stock.id} has an incompatible unit`);
      }
      return total.plus(
        new Prisma.Decimal(stock.quantity.toString())
          .mul(new Prisma.Decimal(stock.unit.conversionFactor.toString()))
          .div(saleUnit.factor),
      );
    }, new Prisma.Decimal(0))
    .toNumber();
};

export const consumeProductStock = async (
  tx: PrismaTypes.TransactionClient,
  productId: string,
  accountId: string,
  quantity: number,
  unitId?: string | null,
): Promise<ProductStockConsumption> => {
  let remaining = new Prisma.Decimal(quantity);
  const saleUnit = await getProductAndSaleUnitFactor(tx, productId, accountId, unitId);
  let totalCost = new Prisma.Decimal(0);
  let staleRetries = 0;
  const allocations: ProductStockAllocationInput[] = [];

  while (remaining.greaterThan(0)) {
    const stocks = await tx.productStock.findMany({
      where: {
        productId,
        accountId,
        isDeleted: false,
        quantity: { gt: 0 },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { unit: { select: { group: true, conversionFactor: true } } },
    });

    if (stocks.length === 0) {
      throw new Error(`Insufficient stock for product: ${productId}`);
    }

    for (const stock of stocks) {
      if (stock.unit.group !== saleUnit.group) {
        throw new Error(`Stock batch ${stock.id} has an incompatible unit`);
      }
    }

    const plan = planFifoStockAllocations(
      stocks.map((stock) => ({
        id: stock.id,
        quantity: stock.quantity,
        purchasePrice: stock.purchasePrice,
        unitConversionFactor: stock.unit.conversionFactor,
      })),
      remaining.toNumber(),
      saleUnit.factor,
    );
    let consumedInPass = false;
    let stockChangedConcurrently = false;

    for (const allocation of plan.allocations) {
      const stock = stocks.find((candidate) => candidate.id === allocation.productStockId);
      if (!stock) throw new Error("FIFO stock batch disappeared during allocation");

      const updated = await tx.productStock.updateMany({
        where: {
          id: stock.id,
          accountId,
          isDeleted: false,
          quantity: { gte: allocation.quantity },
          purchasePrice: stock.purchasePrice,
        },
        data: {
          quantity: { decrement: allocation.quantity },
          totalCost: {
            decrement: new Prisma.Decimal(allocation.quantity).mul(
              new Prisma.Decimal(stock.purchasePrice.toString()),
            ),
          },
        },
      });

      if (updated.count !== 1) {
        stockChangedConcurrently = true;
        break;
      }

      allocations.push(allocation);
      totalCost = totalCost.plus(
        new Prisma.Decimal(allocation.quantity).mul(new Prisma.Decimal(allocation.unitCost)),
      );
      remaining = remaining.minus(
        new Prisma.Decimal(allocation.saleQuantity ?? allocation.quantity),
      );
      consumedInPass = true;
    }

    if (stockChangedConcurrently) {
      staleRetries += 1;
      if (staleRetries > MAX_STALE_RETRIES) {
        throw new Error("Inventory changed during sale. Please retry.");
      }
      continue;
    }

    if (!consumedInPass && remaining.greaterThan(0)) {
      throw new Error(`Insufficient stock for product: ${productId}`);
    }
  }

  return { totalCost: totalCost.toNumber(), allocations };
};

export const restoreProductStockAllocations = async (
  tx: PrismaTypes.TransactionClient,
  accountId: string,
  allocations: ProductStockAllocationInput[],
) => {
  for (const allocation of allocations) {
    if (allocation.quantity <= 0) continue;

    const restored = await tx.productStock.updateMany({
      where: {
        id: allocation.productStockId,
        accountId,
        isDeleted: false,
      },
      data: {
        quantity: { increment: allocation.quantity },
        totalCost: {
          increment: new Prisma.Decimal(allocation.quantity).mul(
            new Prisma.Decimal(allocation.unitCost),
          ),
        },
      },
    });

    if (restored.count !== 1) {
      throw new Error(
        `Cannot restore stock batch ${allocation.productStockId}; the batch is unavailable.`,
      );
    }
  }
};

export const removeProductStockAllocations = async (
  tx: PrismaTypes.TransactionClient,
  accountId: string,
  allocations: ProductStockAllocationInput[],
) => {
  for (const allocation of allocations) {
    if (allocation.quantity <= 0) continue;

    const removed = await tx.productStock.updateMany({
      where: {
        id: allocation.productStockId,
        accountId,
        isDeleted: false,
        quantity: { gte: allocation.quantity },
      },
      data: {
        quantity: { decrement: allocation.quantity },
        totalCost: {
          decrement: new Prisma.Decimal(allocation.quantity).mul(
            new Prisma.Decimal(allocation.unitCost),
          ),
        },
      },
    });

    if (removed.count !== 1) {
      throw new Error(
        `Cannot reverse stock batch ${allocation.productStockId}; some of its units have already been consumed.`,
      );
    }
  }
};
