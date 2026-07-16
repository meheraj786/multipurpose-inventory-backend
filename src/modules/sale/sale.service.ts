import {
  type Prisma,
  type Sale,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
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
      const stockItems: SaleStockItem[] = [];

      for (const item of data.saleItems) {
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
          const purchasePrice = Number(preparedProduct.rawMaterialCost ?? 0);

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

          stockItems.push({
            itemType: "PREPARED_PRODUCT",
            preparedProductId: item.preparedProductId,
            unitId,
            quantity: item.quantity,
          });
        } else {
          if (!item.productId) {
            throw new Error("productId is required for PRODUCT items");
          }

          const product = await tx.product.findFirst({
            where: { id: item.productId, accountId, isDeleted: false },
          });
          if (!product) throw new Error(`Product not found: ${item.productId}`);

          const latestStock = await tx.productStock.findFirst({
            where: { productId: item.productId, accountId, isDeleted: false },
            orderBy: { createdAt: "desc" },
          });

          const purchasePrice = latestStock ? Number(latestStock.purchasePrice) : 0;
          const unitId = item.unitId ?? product.unitId;

          await tx.saleItem.create({
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

          stockItems.push({
            itemType: "PRODUCT",
            productId: item.productId,
            unitId,
            quantity: item.quantity,
          });
        }
      }

      await deductSaleItemsStock(tx, stockItems, accountId);
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
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data,
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
    },
  });

  if (!sale) throw new Error("Sale not found");
  return sale;
};

const updateSale = async (
  id: string,
  accountId: string,
  userId: string,
  data: UpdateSaleInput,
): Promise<Sale> => {
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
      include: { saleItems: true },
    });
    if (!sale) throw new Error("Sale not found");

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
      include: { saleItems: true },
    });
    if (!sale) throw new Error("Sale not found in trash");

    const stockItems = sale.saleItems as SaleStockItem[];

    // Verify there's enough stock for every item before touching anything.
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
