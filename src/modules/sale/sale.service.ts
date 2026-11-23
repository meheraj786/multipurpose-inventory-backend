import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateSaleInput, UpdateSaleInput } from "./sale.validation.js";
import type { PayDueInput } from "../invoice/invoice.validation.js";
import {
  assertSufficientStock,
  deductSaleItemsStock,
  readdSaleItemsStock,
  type SaleStockItem,
} from "./sale.stock.util.js";

const getItemProfit = (item: {
  quantity: number;
  sellPrice: number;
  purchasePrice: number;
  discount?: number | null;
}) => {
  const revenue = Number(item.sellPrice) * Number(item.quantity);
  const cost = Number(item.purchasePrice) * Number(item.quantity);
  const itemDiscount = Number(item.discount ?? 0);
  return revenue - cost - itemDiscount;
};

const getServiceProfit = (sv: {
  quantity: number;
  total: number | Prisma.Decimal;
  service: { internalCost: number | Prisma.Decimal | null } | null;
}) => {
  const revenue = Number(sv.total);
  const internalCost = Number(sv.service?.internalCost ?? 0);
  const totalCost = internalCost * Number(sv.quantity);
  return revenue - totalCost;
};

const getReturnedProfitAdjustment = (sale: {
  saleItems: Array<{
    id: string;
    quantity: Prisma.Decimal | number;
    sellPrice: Prisma.Decimal | number;
    purchasePrice: Prisma.Decimal | number;
    discount?: Prisma.Decimal | number | null;
    itemType: string;
    productId?: string | null;
    preparedProductId?: string | null;
  }>;
  customerReturns?: Array<{
    saleItemId?: string | null;
    itemType: string;
    productId?: string | null;
    preparedProductId?: string | null;
    quantity: Prisma.Decimal | number;
    refundAmount?: Prisma.Decimal | number | null;
    stockAllocations?: Array<{
      quantity: Prisma.Decimal | number;
      unitCost: Prisma.Decimal | number;
    }>;
  }> | null;
}) => {
  const saleItemsById = new Map(sale.saleItems.map((item) => [item.id, item]));
  const returnedBySaleItem = new Map<string, number>();
  let adjustment = 0;

  for (const returnItem of sale.customerReturns ?? []) {
    if (!returnItem.saleItemId) continue;
    const saleItem = saleItemsById.get(returnItem.saleItemId);
    if (!saleItem) continue;

    const quantity = Number(returnItem.quantity ?? 0);
    const cost =
      returnItem.stockAllocations && returnItem.stockAllocations.length > 0
        ? returnItem.stockAllocations.reduce(
            (sum, allocation) => sum + Number(allocation.quantity) * Number(allocation.unitCost),
            0,
          )
        : Number(saleItem.purchasePrice) * quantity;
    const refund = Number(returnItem.refundAmount ?? 0);
    adjustment += refund - cost;
    returnedBySaleItem.set(saleItem.id, (returnedBySaleItem.get(saleItem.id) ?? 0) + quantity);
  }

  for (const returnItem of sale.customerReturns ?? []) {
    if (returnItem.saleItemId) continue;
    let remaining = Number(returnItem.quantity ?? 0);
    const originalQuantity = remaining;
    for (const saleItem of sale.saleItems) {
      if (
        saleItem.itemType !== returnItem.itemType ||
        saleItem.productId !== returnItem.productId ||
        saleItem.preparedProductId !== returnItem.preparedProductId
      ) {
        continue;
      }

      const alreadyReturned = returnedBySaleItem.get(saleItem.id) ?? 0;
      const available = Math.max(0, Number(saleItem.quantity) - alreadyReturned);
      const quantity = Math.min(remaining, available);
      if (quantity <= 0) continue;

      const refund =
        Number(returnItem.refundAmount ?? 0) *
        (originalQuantity > 0 ? quantity / originalQuantity : 0);
      adjustment += refund - Number(saleItem.purchasePrice) * quantity;
      returnedBySaleItem.set(saleItem.id, alreadyReturned + quantity);
      remaining -= quantity;
      if (remaining <= 0) break;
    }
  }

  return adjustment;
};

const createSale = async (data: CreateSaleInput, accountId: string, userId: string) => {
  if (!accountId) throw new Error("accountId is required");

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customerId: data.customerId && data.customerId.trim() !== "" ? data.customerId : null,
        customerNumber: data.customerNumber ?? null,
        paymentMethod: data.paymentMethod,
        payments: data.payments ? JSON.parse(JSON.stringify(data.payments)) : null,
        discount: data.discount ?? 0,
        due: data.due ?? 0,
        accountId,
      },
    });

    if (data.saleItems && data.saleItems.length > 0) {
      const stockItems: SaleStockItem[] = data.saleItems.map((item) => ({
        itemType: item.itemType,
        productId: item.productId,
        preparedProductId: item.preparedProductId,
        unitId: item.unitId,
        quantity: item.quantity,
      }));

      const stockDeduction = await deductSaleItemsStock(tx, stockItems, accountId);

      for (const [itemIndex, item] of data.saleItems.entries()) {
        if (item.itemType === "PREPARED_PRODUCT") {
          if (!item.preparedProductId) {
            throw new Error("preparedProductId is required for PREPARED_PRODUCT items");
          }

          const preparedProduct = await tx.preparedProduct.findFirst({
            where: { id: item.preparedProductId, accountId, isDeleted: false },
          });
          if (!preparedProduct) {
            throw new Error(`Prepared product not found: ${item.preparedProductId}`);
          }

          const unitId = item.unitId ?? preparedProduct.unitId;
          const purchasePrice =
            stockDeduction.unitCosts[itemIndex] ?? Number(preparedProduct.rawMaterialCost ?? 0);

          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              itemType: "PREPARED_PRODUCT",
              preparedProductId: item.preparedProductId,
              unitId,
              quantity: item.quantity,
              convertedQty: item.quantity,
              purchasePrice,
              sellPrice: item.sellPrice,
              discount: item.discount ?? 0,
              accountId,
            },
          });
        } else {
          if (!item.productId) {
            throw new Error("productId is required for PRODUCT items");
          }

          const product = await tx.product.findFirst({
            where: { id: item.productId, accountId, isDeleted: false },
          });
          if (!product) throw new Error(`Product not found: ${item.productId}`);

          const unitId = item.unitId ?? product.unitId;
          const purchasePrice = stockDeduction.unitCosts[itemIndex] ?? 0;

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: sale.id,
              itemType: "PRODUCT",
              productId: item.productId,
              unitId,
              quantity: item.quantity,
              convertedQty: item.quantity,
              purchasePrice,
              sellPrice: item.sellPrice,
              discount: item.discount ?? 0,
              accountId,
            },
          });

          const allocations = stockDeduction.productAllocations
            .filter((allocation) => allocation.itemIndex === itemIndex)
            .map(({ itemIndex: _itemIndex, ...allocation }) => ({
              saleItemId: saleItem.id,
              ...allocation,
            }));
          if (allocations.length) {
            await tx.saleItemStockAllocation.createMany({ data: allocations });
          }
        }
      }
    }

    if (data.saleServices && data.saleServices.length > 0) {
      for (const service of data.saleServices) {
        const total = service.unitPrice * service.quantity - (service.discount ?? 0);
        await tx.saleService.create({
          data: {
            saleId: sale.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
            unitPrice: service.unitPrice,
            discount: service.discount ?? 0,
            total,
            accountId,
          },
        });
      }
    }

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.CREATE,
      details: `Created sale with ${data.saleItems?.length ?? 0} item(s) and ${data.saleServices?.length ?? 0} service(s)`,
      accountId,
    });

    return await tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        customer: true,
        saleItems: { include: { product: true, preparedProduct: true } },
        saleServices: { include: { service: true } },
      },
    });
  });
};

const getAllSales = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  startDate?: string,
  endDate?: string,
  dueOnly?: boolean,
) => {
  const skip = (page - 1) * limit;

  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    createdAtFilter.gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    createdAtFilter.lte = end;
  }

  const where: Prisma.SaleWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { customerNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      createdAt: createdAtFilter,
    }),
    ...(dueOnly && { due: { gt: 0 } }),
  };

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        saleItems: { include: { product: true, preparedProduct: true } },
        saleServices: { include: { service: true } },
        invoices: true,
        customerReturns: {
          include: {
            product: true,
            preparedProduct: true,
            stockAllocations: true,
          },
        },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  const dataWithProfit = data.map((sale) => {
    const itemsWithProfit = sale.saleItems.map((item) => ({
      ...item,
      profit: getItemProfit({
        quantity: Number(item.quantity),
        sellPrice: Number(item.sellPrice),
        purchasePrice: Number(item.purchasePrice),
        discount: item.discount ? Number(item.discount) : null,
      }),
    }));

    const servicesWithProfit = sale.saleServices.map((sv) => ({
      ...sv,
      profit: getServiceProfit(sv),
    }));

    const itemTotalProfit = itemsWithProfit.reduce((sum, i) => sum + i.profit, 0);
    const serviceTotalProfit = servicesWithProfit.reduce((sum, s) => sum + s.profit, 0);
    const saleDiscount = Number(sale.discount ?? 0);
    const returnedProfitAdjustment = getReturnedProfitAdjustment(sale);
    const totalProfit =
      itemTotalProfit + serviceTotalProfit - saleDiscount - returnedProfitAdjustment;

    return {
      ...sale,
      saleItems: itemsWithProfit,
      saleServices: servicesWithProfit,
      profit: totalProfit,
    };
  });

  return {
    data: dataWithProfit,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleSale = async (id: string, accountId: string) => {
  const sale = await prisma.sale.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      customer: true,
      saleItems: { include: { product: true, preparedProduct: true } },
      saleServices: { include: { service: true } },
      invoices: true,
      customerReturns: {
        include: {
          product: true,
          preparedProduct: true,
          stockAllocations: true,
        },
      },
    },
  });

  if (!sale) throw new Error("Sale not found");

  const itemsWithProfit = sale.saleItems.map((item) => ({
    ...item,
    profit: getItemProfit({
      quantity: Number(item.quantity),
      sellPrice: Number(item.sellPrice),
      purchasePrice: Number(item.purchasePrice),
      discount: item.discount ? Number(item.discount) : null,
    }),
  }));

  const servicesWithProfit = sale.saleServices.map((sv) => ({
    ...sv,
    profit: getServiceProfit(sv),
  }));

  const itemTotalProfit = itemsWithProfit.reduce((sum, i) => sum + i.profit, 0);
  const serviceTotalProfit = servicesWithProfit.reduce((sum, s) => sum + s.profit, 0);
  const saleDiscount = Number(sale.discount ?? 0);
  const returnedProfitAdjustment = getReturnedProfitAdjustment(sale);
  const totalProfit =
    itemTotalProfit + serviceTotalProfit - saleDiscount - returnedProfitAdjustment;

  return {
    ...sale,
    saleItems: itemsWithProfit,
    saleServices: servicesWithProfit,
    profit: totalProfit,
  };
};

const updateSale = async (id: string, accountId: string, userId: string, data: UpdateSaleInput) => {
  const existing = await prisma.sale.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Sale not found");

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      ...(data.customerId !== undefined && { customerId: data.customerId }),
      ...(data.customerNumber !== undefined && {
        customerNumber: data.customerNumber,
      }),
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.payments !== undefined && {
        payments: data.payments ? JSON.parse(JSON.stringify(data.payments)) : null,
      }),
      ...(data.discount !== undefined && { discount: data.discount }),
      ...(data.due !== undefined && { due: data.due }),
    },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SALE,
    action: SystemAction.UPDATE,
    details: `Updated sale: ${id}`,
    accountId,
  });

  return updated;
};

const payDue = async (saleId: string, accountId: string, userId: string, data: PayDueInput) => {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, accountId, isDeleted: false },
      include: { customer: true },
    });

    if (!sale) throw new Error("Sale not found");

    const currentDue = Number(sale.due ?? 0);
    if (currentDue <= 0) throw new Error("This sale has no outstanding due");

    if (data.amountPaid > currentDue) {
      throw new Error(`Amount paid (${data.amountPaid}) exceeds outstanding due (${currentDue})`);
    }

    const newDue = Number((currentDue - data.amountPaid).toFixed(2));
    const isDueCleared = newDue === 0;

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: { due: newDue },
    });

    const billTo = sale.customer?.name ?? sale.customerNumber ?? "Walk-in Customer";

    const invoice = await tx.invoice.create({
      data: {
        billTo,
        invoiceDate: new Date(),
        saleId,
        status: isDueCleared ? "PAID" : "PARTIALLY_PAID",
        grandTotal: data.amountPaid,
        accountId,
      },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.UPDATE,
      details: `Due payment of ${data.amountPaid} received for sale ${saleId}. Remaining due: ${newDue}`,
      accountId,
    });

    return {
      sale: updatedSale,
      invoice,
      amountPaid: data.amountPaid,
      remainingDue: newDue,
      isDueCleared,
    };
  });
};

const deleteSale = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const sale = await tx.sale.findFirst({
      where: { id, accountId, isDeleted: false },
      include: {
        saleItems: { include: { stockAllocations: true } },
        customerReturns: {
          where: { isDeleted: false },
          select: { id: true },
        },
      },
    });
    if (!sale) throw new Error("Sale not found");
    if (sale.customerReturns.length > 0) {
      throw new Error("Delete the active customer returns before deleting this sale");
    }

    await readdSaleItemsStock(tx, sale.saleItems as SaleStockItem[], accountId);

    const result = await tx.sale.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.SALE,
      itemName: `Sale-${sale.id}`,
      itemId: sale.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.DELETE,
      details: `Deleted sale ${sale.id} — restored stock for ${sale.saleItems.length} item(s)`,
      accountId,
    });

    return result;
  });
};

const restoreSale = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const sale = await tx.sale.findFirst({
      where: { id, accountId, isDeleted: true },
      include: { saleItems: { include: { stockAllocations: true } } },
    });
    if (!sale) throw new Error("Sale not found in trash");

    const stockItems = sale.saleItems as SaleStockItem[];

    await assertSufficientStock(tx, stockItems, accountId);
    await deductSaleItemsStock(tx, stockItems, accountId);

    const result = await tx.sale.update({
      where: { id },
      data: { isDeleted: false },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.RESTORE,
      details: `Restored sale ${id} — deducted stock for ${sale.saleItems.length} item(s)`,
      accountId,
    });

    return result;
  });
};

export const SaleService = {
  createSale,
  getAllSales,
  getSingleSale,
  updateSale,
  payDue,
  deleteSale,
  restoreSale,
};
