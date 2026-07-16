import prisma from "../../shared/utils/prisma.js";
import {
  type DateRangePreset,
  getPreviousPeriod,
  resolveDateRange,
} from "../../shared/utils/dateRange.js";
import { Purchase } from "@/generated/prisma/index.js";

// ==================== SHARED CALC HELPERS ====================

const calcItemRevenue = (item: { sellPrice: unknown; quantity: unknown; discount: unknown }) =>
  Number(item.sellPrice) * Number(item.quantity) - Number(item.discount ?? 0);

const calcItemCost = (item: { purchasePrice: unknown; quantity: unknown }) =>
  Number(item.purchasePrice) * Number(item.quantity);

const createdAtWhere = (start?: Date, end?: Date) =>
  start || end ? { createdAt: { ...(start && { gte: start }), ...(end && { lte: end }) } } : {};

// ==================== 1. SALES / AMOUNT / PROFIT ====================

const getSalesOverview = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const sales = await prisma.sale.findMany({
    where: { accountId, isDeleted: false, ...createdAtWhere(start, end) },
    include: {
      saleItems: true,
      saleServices: { include: { service: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let totalAmount = 0;
  let totalCost = 0;
  const dailyMap = new Map<string, { sales: number; amount: number; profit: number }>();

  for (const sale of sales) {
    const itemsRevenue = sale.saleItems.reduce((s, i) => s + calcItemRevenue(i), 0);
    const itemsCost = sale.saleItems.reduce((s, i) => s + calcItemCost(i), 0);
    const servicesRevenue = sale.saleServices.reduce((s, sv) => s + Number(sv.total), 0);
    const servicesCost = sale.saleServices.reduce(
      (s, sv) => s + Number(sv.service?.internalCost ?? 0) * sv.quantity,
      0,
    );

    const revenue = Math.max(0, itemsRevenue + servicesRevenue - Number(sale.discount ?? 0));
    const cost = itemsCost + servicesCost;

    totalAmount += revenue;
    totalCost += cost;

    const dayKey = sale.createdAt.toISOString().split("T")[0] as string;
    const bucket = dailyMap.get(dayKey) ?? { sales: 0, amount: 0, profit: 0 };
    bucket.sales += 1;
    bucket.amount += revenue;
    bucket.profit += revenue - cost;
    dailyMap.set(dayKey, bucket);
  }

  const chart = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      sales: v.sales,
      amount: Number(v.amount.toFixed(2)),
      profit: Number(v.profit.toFixed(2)),
    }));

  return {
    range,
    startDate: start ?? null,
    endDate: end ?? null,
    totalSales: sales.length,
    totalAmount: Number(totalAmount.toFixed(2)),
    totalProfit: Number((totalAmount - totalCost).toFixed(2)),
    chart,
  };
};

// ==================== 2. REVENUE / CUSTOMERS / GROWTH ====================

const computeRevenueAndCustomers = async (accountId: string, start?: Date, end?: Date) => {
  const sales = await prisma.sale.findMany({
    where: { accountId, isDeleted: false, ...createdAtWhere(start, end) },
    include: { saleItems: true, saleServices: true },
  });

  let revenue = 0;
  const customerSet = new Set<string>();

  for (const sale of sales) {
    const itemsRevenue = sale.saleItems.reduce((s, i) => s + calcItemRevenue(i), 0);
    const servicesRevenue = sale.saleServices.reduce((s, sv) => s + Number(sv.total), 0);
    revenue += Math.max(0, itemsRevenue + servicesRevenue - Number(sale.discount ?? 0));
    customerSet.add(sale.customerId ?? `walkin:${sale.customerNumber ?? sale.id}`);
  }

  return { revenue, customers: customerSet.size };
};

const getOverviewStats = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const current = await computeRevenueAndCustomers(accountId, start, end);
  const totalCustomersAllTime = await prisma.customer.count({
    where: { accountId, isDeleted: false },
  });

  let growthRate: number | null = null;
  if (start && end) {
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(start, end);
    const previous = await computeRevenueAndCustomers(accountId, prevStart, prevEnd);
    growthRate =
      previous.revenue > 0
        ? Number((((current.revenue - previous.revenue) / previous.revenue) * 100).toFixed(2))
        : current.revenue > 0
          ? 100
          : 0;
  }

  return {
    range,
    startDate: start ?? null,
    endDate: end ?? null,
    totalRevenue: Number(current.revenue.toFixed(2)),
    activeCustomers: current.customers,
    totalCustomers: totalCustomersAllTime,
    growthRate, // null when range === "all" (no comparable previous period)
  };
};

// ==================== 3. TOP CUSTOMERS ====================

const getTopCustomers = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  limit = 10,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const sales = await prisma.sale.findMany({
    where: { accountId, isDeleted: false, ...createdAtWhere(start, end) },
    include: { customer: true, saleItems: true, saleServices: true },
  });

  type Bucket = {
    customerId: string | null;
    name: string;
    phone: string | null;
    salesCount: number;
    totalPurchase: number;
    totalDue: number;
  };
  const map = new Map<string, Bucket>();

  for (const sale of sales) {
    const itemsRevenue = sale.saleItems.reduce((s, i) => s + calcItemRevenue(i), 0);
    const servicesRevenue = sale.saleServices.reduce((s, sv) => s + Number(sv.total), 0);
    const revenue = Math.max(0, itemsRevenue + servicesRevenue - Number(sale.discount ?? 0));

    const key = sale.customerId ?? `walkin:${sale.customerNumber ?? "unknown"}`;
    const bucket =
      map.get(key) ??
      ({
        customerId: sale.customerId,
        name: sale.customer?.name ?? sale.customerNumber ?? "Walk-in Customer",
        phone: sale.customer?.phone ?? sale.customerNumber ?? null,
        salesCount: 0,
        totalPurchase: 0,
        totalDue: 0,
      } as Bucket);

    bucket.salesCount += 1;
    bucket.totalPurchase += revenue;
    bucket.totalDue += Number(sale.due ?? 0);
    map.set(key, bucket);
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalPurchase - a.totalPurchase)
    .slice(0, limit)
    .map((c) => ({
      ...c,
      totalPurchase: Number(c.totalPurchase.toFixed(2)),
      totalDue: Number(c.totalDue.toFixed(2)),
    }));
};

// ==================== 4. DUE RANKING ====================

const getDueRanking = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  limit = 10,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const sales = await prisma.sale.findMany({
    where: {
      accountId,
      isDeleted: false,
      due: { gt: 0 },
      ...createdAtWhere(start, end),
    },
    include: { customer: true },
  });

  type Bucket = {
    customerId: string | null;
    name: string;
    phone: string | null;
    salesWithDue: number;
    totalDue: number;
  };
  const map = new Map<string, Bucket>();

  for (const sale of sales) {
    const key = sale.customerId ?? `walkin:${sale.customerNumber ?? "unknown"}`;
    const bucket =
      map.get(key) ??
      ({
        customerId: sale.customerId,
        name: sale.customer?.name ?? sale.customerNumber ?? "Walk-in Customer",
        phone: sale.customer?.phone ?? sale.customerNumber ?? null,
        salesWithDue: 0,
        totalDue: 0,
      } as Bucket);

    bucket.salesWithDue += 1;
    bucket.totalDue += Number(sale.due ?? 0);
    map.set(key, bucket);
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, limit)
    .map((c) => ({ ...c, totalDue: Number(c.totalDue.toFixed(2)) }));
};

// ==================== 5. CATEGORY / SUB-CATEGORY RANKING ====================

const getCategoryRanking = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const [sales, categories, subCategories] = await Promise.all([
    prisma.sale.findMany({
      where: { accountId, isDeleted: false, ...createdAtWhere(start, end) },
      include: {
        saleItems: { include: { product: true, preparedProduct: true } },
        saleServices: { include: { service: true } },
      },
    }),
    prisma.category.findMany({ where: { accountId, isDeleted: false } }),
    prisma.subCategory.findMany({ where: { accountId, isDeleted: false } }),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const subCategoryNames = new Map(subCategories.map((c) => [c.id, c.name]));

  type Bucket = { id: string; name: string; quantity: number; revenue: number };
  const categoryAgg = new Map<string, Bucket>();
  const subCategoryAgg = new Map<string, Bucket>();

  const bump = (
    map: Map<string, Bucket>,
    id: string | null | undefined,
    names: Map<string, string>,
    quantity: number,
    revenue: number,
  ) => {
    if (!id) return;
    const bucket = map.get(id) ?? {
      id,
      name: names.get(id) ?? "Uncategorized",
      quantity: 0,
      revenue: 0,
    };
    bucket.quantity += quantity;
    bucket.revenue += revenue;
    map.set(id, bucket);
  };

  for (const sale of sales) {
    for (const item of sale.saleItems) {
      const categoryId = item.product?.categoryId ?? item.preparedProduct?.categoryId ?? null;
      const subCategoryId =
        item.product?.subCategoryId ?? item.preparedProduct?.subCategoryId ?? null;
      const revenue = calcItemRevenue(item);
      const quantity = Number(item.quantity);
      bump(categoryAgg, categoryId, categoryNames, quantity, revenue);
      bump(subCategoryAgg, subCategoryId, subCategoryNames, quantity, revenue);
    }

    for (const sv of sale.saleServices) {
      const categoryId = sv.service?.categoryId ?? null;
      const subCategoryId = sv.service?.subCategoryId ?? null;
      const revenue = Number(sv.total);
      bump(categoryAgg, categoryId, categoryNames, sv.quantity, revenue);
      bump(subCategoryAgg, subCategoryId, subCategoryNames, sv.quantity, revenue);
    }
  }

  const sortByRevenue = (a: Bucket, b: Bucket) => b.revenue - a.revenue;

  return {
    categories: Array.from(categoryAgg.values())
      .sort(sortByRevenue)
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        quantity: c.quantity,
        revenue: Number(c.revenue.toFixed(2)),
      })),
    subCategories: Array.from(subCategoryAgg.values())
      .sort(sortByRevenue)
      .map((c) => ({
        subCategoryId: c.id,
        name: c.name,
        quantity: c.quantity,
        revenue: Number(c.revenue.toFixed(2)),
      })),
  };
};

// ==================== 6. LOW STOCK ALERT ====================

const getLowStockAlert = async (accountId: string) => {
  const [products, rawProducts] = await Promise.all([
    prisma.product.findMany({
      where: { accountId, isDeleted: false },
      include: {
        productStocks: { where: { isDeleted: false } },
        unit: true,
        category: true,
      },
    }),
    prisma.rawProduct.findMany({
      where: { accountId, isDeleted: false },
      include: { unit: true, category: true },
    }),
  ]);

  const lowStockProducts = products
    .map((p) => {
      const currentStock = p.productStocks.reduce((s, ps) => s + Number(ps.quantity), 0);
      const threshold = p.lowStockAlert ? Number(p.lowStockAlert) : null;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit?.symbol,
        category: p.category?.name,
        currentStock,
        threshold,
      };
    })
    .filter(
      (p) =>
        p.threshold !== null &&
        !Number.isNaN(p.threshold) &&
        p.currentStock <= (p.threshold as number),
    )
    .sort((a, b) => a.currentStock - b.currentStock);

  const lowStockRawProducts = rawProducts
    .map((rp) => ({
      id: rp.id,
      name: rp.name,
      unit: rp.unit?.symbol,
      category: rp.category?.name,
      currentStock: Number(rp.totalStock),
      threshold: rp.lowStockAlert ? Number(rp.lowStockAlert) : null,
    }))
    .filter(
      (rp) =>
        rp.threshold !== null &&
        !Number.isNaN(rp.threshold) &&
        rp.currentStock <= (rp.threshold as number),
    )
    .sort((a, b) => a.currentStock - b.currentStock);

  return { products: lowStockProducts, rawProducts: lowStockRawProducts };
};

// ==================== 7. PRODUCT / PREPARED PRODUCT RANKING ====================

const getProductRanking = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  limit = 10,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const sales = await prisma.sale.findMany({
    where: { accountId, isDeleted: false, ...createdAtWhere(start, end) },
    include: {
      saleItems: { include: { product: true, preparedProduct: true } },
    },
  });

  type ProductBucket = {
    productId: string;
    name: string;
    sku: string | null;
    quantity: number;
    revenue: number;
  };
  type PreparedBucket = {
    preparedProductId: string;
    name: string;
    quantity: number;
    revenue: number;
  };

  const productAgg = new Map<string, ProductBucket>();
  const preparedAgg = new Map<string, PreparedBucket>();

  for (const sale of sales) {
    for (const item of sale.saleItems) {
      const revenue = calcItemRevenue(item);
      const quantity = Number(item.quantity);

      if (item.itemType === "PRODUCT" && item.productId) {
        const bucket = productAgg.get(item.productId) ?? {
          productId: item.productId,
          name: item.product?.name ?? "Unknown Product",
          sku: item.product?.sku ?? null,
          quantity: 0,
          revenue: 0,
        };
        bucket.quantity += quantity;
        bucket.revenue += revenue;
        productAgg.set(item.productId, bucket);
      } else if (item.itemType === "PREPARED_PRODUCT" && item.preparedProductId) {
        const bucket = preparedAgg.get(item.preparedProductId) ?? {
          preparedProductId: item.preparedProductId,
          name: item.preparedProduct?.name ?? "Unknown Prepared Product",
          quantity: 0,
          revenue: 0,
        };
        bucket.quantity += quantity;
        bucket.revenue += revenue;
        preparedAgg.set(item.preparedProductId, bucket);
      }
    }
  }

  return {
    products: Array.from(productAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({ ...p, revenue: Number(p.revenue.toFixed(2)) })),
    preparedProducts: Array.from(preparedAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({ ...p, revenue: Number(p.revenue.toFixed(2)) })),
  };
};
const getTopSuppliers = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  limit = 10,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const purchases = await prisma.purchase.findMany({
    where: {
      accountId,
      isDeleted: false,
      ...createdAtWhere(start, end),
    },
    include: {
      supplier: true,
    },
  });

  type Bucket = {
    supplierId: string;
    name: string;
    companyName: string | null;
    purchaseCount: number;
    totalQuantity: number;
    totalPurchase: number;
  };

  const map = new Map<string, Bucket>();

  for (const purchase of purchases) {
    if (!purchase.supplierId || !purchase.supplier) continue;

    const bucket = map.get(purchase.supplierId) ?? {
      supplierId: purchase.supplierId,
      name: purchase.supplier.name,
      companyName: purchase.supplier.companyName ?? null,
      purchaseCount: 0,
      totalQuantity: 0,
      totalPurchase: 0,
    };

    bucket.purchaseCount += 1;
    bucket.totalQuantity += Number(purchase.qty);
    bucket.totalPurchase += Number(purchase.totalCost);

    map.set(purchase.supplierId, bucket);
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalPurchase - a.totalPurchase)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      totalQuantity: Number(item.totalQuantity.toFixed(2)),
      totalPurchase: Number(item.totalPurchase.toFixed(2)),
    }));
};
const getPurchaseOverview = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const purchases = await prisma.purchase.findMany({
    where: {
      accountId,
      isDeleted: false,
      ...createdAtWhere(start, end),
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let totalCost = 0;
  let totalQuantity = 0;

  const chartMap = new Map<
    string,
    {
      purchases: number;
      quantity: number;
      cost: number;
    }
  >();

  for (const purchase of purchases) {
    totalCost += Number(purchase.totalCost);
    totalQuantity += Number(purchase.qty);

    const day = purchase.createdAt.toISOString().split("T")[0];

    const bucket = chartMap.get(day) ?? {
      purchases: 0,
      quantity: 0,
      cost: 0,
    };

    bucket.purchases += 1;
    bucket.quantity += Number(purchase.qty);
    bucket.cost += Number(purchase.totalCost);

    chartMap.set(day, bucket);
  }

  const chart = Array.from(chartMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      purchases: value.purchases,
      quantity: Number(value.quantity.toFixed(2)),
      cost: Number(value.cost.toFixed(2)),
    }));

  return {
    range,
    startDate: start ?? null,
    endDate: end ?? null,
    totalPurchases: purchases.length,
    totalQuantity: Number(totalQuantity.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    chart,
  };
};
const getPurchaseReport = async (
  accountId: string,
  range: DateRangePreset,
  customStart?: string,
  customEnd?: string,
) => {
  const { start, end } = resolveDateRange(range, customStart, customEnd);

  const purchases = await prisma.purchase.findMany({
    where: {
      accountId,
      isDeleted: false,
      ...createdAtWhere(start, end),
    },
    include: {
      supplier: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let totalCost = 0;
  let totalQuantity = 0;

  for (const purchase of purchases) {
    totalCost += Number(purchase.totalCost);
    totalQuantity += Number(purchase.qty);
  }

  return {
    summary: {
      totalPurchases: purchases.length,
      totalQuantity: Number(totalQuantity.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
    },
    purchases: purchases.map((purchase: any) => ({
      id: purchase.id,
      supplierId: purchase.supplierId,
      supplier: purchase.supplier?.name ?? null,
      companyName: purchase.supplier?.companyName ?? null,
      quantity: Number(purchase.qty),
      purchasePrice: Number(purchase.purchasePrice),
      rate: Number(purchase.rate),
      totalCost: Number(purchase.totalCost),
      notes: purchase.notes,
      createdAt: purchase.createdAt,
    })),
  };
};

export const DashboardService = {
  getSalesOverview,
  getOverviewStats,
  getTopCustomers,
  getDueRanking,
  getCategoryRanking,
  getLowStockAlert,
  getProductRanking,
  getTopSuppliers,
  getPurchaseOverview,
  getPurchaseReport,
};
