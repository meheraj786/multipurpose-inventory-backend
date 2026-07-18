// import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
// import prisma from "../../shared/utils/prisma.js";
// import { ActivityLogService } from "../activityLog/activityLog.service.js";
// import { TrashService } from "../trash/trash.service.js";
// import type {
//   CreatePreparedProductInput,
//   UpdatePreparedProductInput,
// } from "./preparedProduct.validation.js";

// const createPreparedProduct = async (
//   data: CreatePreparedProductInput,
//   accountId: string,
//   userId: string,
// ) => {
//   const { items, ...productData } = data;

//   const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
//   if (!unit) throw new Error("Unit not found");

//   const rawProductIds = items.map((i) => i.rawProductId);
//   const rawProducts = await prisma.rawProduct.findMany({
//     where: { id: { in: rawProductIds }, accountId, isDeleted: false },
//   });
//   if (rawProducts.length !== rawProductIds.length) {
//     throw new Error("One or more raw products not found");
//   }

//   const preparedProduct = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//     return await tx.preparedProduct.create({
//       data: {
//         ...productData,
//         accountId,
//         ...(productData.expiryDate && {
//           expiryDate: new Date(productData.expiryDate),
//         }),
//         preparedProductItems: {
//           create: items.map((item) => ({
//             rawProductId: item.rawProductId,
//             quantity: item.quantity,
//             unit: item.unit,
//           })),
//         },
//       },
//       include: {
//         unit: true,
//         preparedProductItems: {
//           include: { rawProduct: { include: { unit: true } } },
//         },
//       },
//     });
//   });

//   await ActivityLogService.createLog({
//     userId,
//     module: SystemModule.PREPARED_PRODUCT,
//     action: SystemAction.CREATE,
//     details: `Created prepared product: ${preparedProduct.name}`,
//     accountId,
//   });

//   return preparedProduct;
// };

// const getAllPreparedProducts = async (
//   accountId: string,
//   page = 1,
//   limit = 10,
//   search?: string,
//   categoryId?: string,
// ) => {
//   const skip = (page - 1) * limit;

//   const where: Prisma.PreparedProductWhereInput = {
//     accountId,
//     isDeleted: false,
//     ...(categoryId && { categoryId }),
//     ...(search && {
//       OR: [
//         { name: { contains: search, mode: "insensitive" } },
//         { description: { contains: search, mode: "insensitive" } },
//       ],
//     }),
//   };

//   const [data, total] = await Promise.all([
//     prisma.preparedProduct.findMany({
//       where,
//       skip,
//       take: limit,
//       orderBy: { createdAt: "desc" },
//       include: {
//         unit: true,
//         preparedProductItems: {
//           include: { rawProduct: { include: { unit: true } } },
//         },
//         preparedProductStocks: {
//           where: { isDeleted: false },
//           select: { quantity: true },
//         },
//       },
//     }),
//     prisma.preparedProduct.count({ where }),
//   ]);

//   const dataWithStock = data.map((pp) => ({
//     ...pp,
//     totalStock: pp.preparedProductStocks.reduce((sum, s) => sum + Number(s.quantity), 0),
//   }));

//   return {
//     data: dataWithStock,
//     meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
//   };
// };

// const getSinglePreparedProduct = async (id: string, accountId: string) => {
//   const preparedProduct = await prisma.preparedProduct.findFirst({
//     where: { id, accountId, isDeleted: false },
//     include: {
//       unit: true,
//       preparedProductItems: {
//         include: { rawProduct: { include: { unit: true } } },
//       },
//       preparedProductStocks: {
//         where: { isDeleted: false },
//         orderBy: { createdAt: "desc" },
//       },
//     },
//   });

//   if (!preparedProduct) throw new Error("Prepared product not found");

//   const totalStock = preparedProduct.preparedProductStocks.reduce(
//     (sum, s) => sum + Number(s.quantity),
//     0,
//   );

//   return { ...preparedProduct, totalStock };
// };

// const updatePreparedProduct = async (
//   id: string,
//   accountId: string,
//   data: UpdatePreparedProductInput,
//   userId: string,
// ) => {
//   const existing = await prisma.preparedProduct.findFirst({
//     where: { id, accountId, isDeleted: false },
//   });
//   if (!existing) throw new Error("Prepared product not found");

//   const { items, expiryDate, ...productData } = data;

//   const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//     if (items && items.length > 0) {
//       const rawProductIds = items.map((i) => i.rawProductId);
//       const rawProducts = await tx.rawProduct.findMany({
//         where: { id: { in: rawProductIds }, accountId, isDeleted: false },
//       });
//       if (rawProducts.length !== rawProductIds.length) {
//         throw new Error("One or more raw products not found");
//       }

//       await tx.preparedProductItem.deleteMany({
//         where: { preparedProductId: id },
//       });

//       await tx.preparedProductItem.createMany({
//         data: items.map((item) => ({
//           preparedProductId: id,
//           rawProductId: item.rawProductId,
//           quantity: item.quantity,
//           unit: item.unit,
//         })),
//       });
//     }

//     return await tx.preparedProduct.update({
//       where: { id },
//       data: {
//         ...productData,
//         ...(expiryDate && { expiryDate: new Date(expiryDate) }),
//       },
//       include: {
//         unit: true,
//         preparedProductItems: {
//           include: { rawProduct: { include: { unit: true } } },
//         },
//       },
//     });
//   });

//   await ActivityLogService.createLog({
//     userId,
//     module: SystemModule.PREPARED_PRODUCT,
//     action: SystemAction.UPDATE,
//     details: `Updated prepared product: ${updated.name}`,
//     accountId,
//   });

//   return updated;
// };

// const deletePreparedProduct = async (id: string, accountId: string, userId: string) => {
//   return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//     const preparedProduct = await tx.preparedProduct.findFirst({
//       where: { id, accountId, isDeleted: false },
//     });
//     if (!preparedProduct) throw new Error("Prepared product not found");

//     const activeStock = await tx.preparedProductStock.count({
//       where: { preparedProductId: id, isDeleted: false, quantity: { gt: 0 } },
//     });
//     if (activeStock > 0) {
//       throw new Error("Cannot delete prepared product with active stock. Clear stock first.");
//     }

//     await tx.preparedProductItem.deleteMany({
//       where: { preparedProductId: id },
//     });

//     const result = await tx.preparedProduct.update({
//       where: { id },
//       data: { isDeleted: true },
//     });

//     await TrashService.addToTrash({
//       moduleName: SystemModule.PREPARED_PRODUCT,
//       itemName: preparedProduct.name,
//       itemId: preparedProduct.id,
//       deletedBy: userId,
//       accountId,
//     });

//     await ActivityLogService.createLog({
//       userId,
//       module: SystemModule.PREPARED_PRODUCT,
//       action: SystemAction.DELETE,
//       details: `Deleted prepared product: ${preparedProduct.name}`,
//       accountId,
//     });

//     return result;
//   });
// };

// const produceStock = async (id: string, accountId: string, userId: string, quantity: number) => {
//   return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//     const preparedProduct = await tx.preparedProduct.findFirst({
//       where: { id, accountId, isDeleted: false },
//       include: {
//         preparedProductItems: {
//           include: { rawProduct: true },
//         },
//       },
//     });
//     if (!preparedProduct) throw new Error("Prepared product not found");

//     for (const item of preparedProduct.preparedProductItems) {
//       const requiredQty = Number(item.quantity) * quantity;

//       const rawProduct = await tx.rawProduct.findFirst({
//         where: { id: item.rawProductId, accountId, isDeleted: false },
//       });
//       if (!rawProduct) throw new Error(`Raw product not found: ${item.rawProductId}`);

//       if (Number(rawProduct.totalStock) < requiredQty) {
//         throw new Error(
//           `Insufficient stock for raw product: ${rawProduct.name}. Required: ${requiredQty}, Available: ${rawProduct.totalStock}`,
//         );
//       }

//       await tx.rawProduct.update({
//         where: { id: item.rawProductId },
//         data: { totalStock: { decrement: requiredQty } },
//       });

//       const rawStocks = await tx.rawProductStock.findMany({
//         where: {
//           rawProductId: item.rawProductId,
//           accountId,
//           isDeleted: false,
//           quantity: { gt: 0 },
//         },
//         orderBy: { createdAt: "asc" },
//       });

//       let remaining = requiredQty;
//       for (const stock of rawStocks) {
//         if (remaining <= 0) break;
//         const deduct = Math.min(remaining, Number(stock.quantity));
//         await tx.rawProductStock.update({
//           where: { id: stock.id },
//           data: { quantity: { decrement: deduct } },
//         });
//         remaining -= deduct;
//       }
//     }

//     const newStock = await tx.preparedProductStock.create({
//       data: { preparedProductId: id, accountId, quantity },
//     });

//     await ActivityLogService.createLog({
//       userId,
//       module: SystemModule.PREPARED_PRODUCT,
//       action: SystemAction.STOCK_IN,
//       details: `Produced ${quantity} units of ${preparedProduct.name}`,
//       accountId,
//     });

//     return newStock;
//   });
// };

// export const PreparedProductService = {
//   createPreparedProduct,
//   getAllPreparedProducts,
//   getSinglePreparedProduct,
//   updatePreparedProduct,
//   deletePreparedProduct,
//   produceStock,
// };

import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type {
  CreatePreparedProductInput,
  UpdatePreparedProductInput,
} from "./preparedProduct.validation.js";

const createPreparedProduct = async (
  data: CreatePreparedProductInput,
  accountId: string,
  userId: string,
) => {
  const { items, ...productData } = data;

  const unit = await prisma.unit.findUnique({
    where: { id: data.unitId },
  });

  if (!unit) {
    throw new Error("Unit not found");
  }

  const rawProductIds = items.map((i) => i.rawProductId);

  const rawProducts = await prisma.rawProduct.findMany({
    where: {
      id: {
        in: rawProductIds,
      },
      accountId,
      isDeleted: false,
    },
  });

  if (rawProducts.length !== rawProductIds.length) {
    throw new Error("One or more raw products not found");
  }

  const preparedProduct = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return tx.preparedProduct.create({
      data: {
        ...productData,
        accountId,
        preparedProductItems: {
          create: items.map((item) => ({
            rawProductId: item.rawProductId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        unit: true,
        preparedProductItems: {
          include: {
            rawProduct: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PREPARED_PRODUCT,
    action: SystemAction.CREATE,
    details: `Created prepared product: ${preparedProduct.name}`,
    accountId,
  });

  return preparedProduct;
};

const getAllPreparedProducts = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  categoryId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.PreparedProductWhereInput = {
    accountId,
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.preparedProduct.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        unit: true,
        preparedProductItems: {
          include: {
            rawProduct: {
              include: {
                unit: true,
              },
            },
          },
        },
        preparedProductStocks: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    prisma.preparedProduct.count({
      where,
    }),
  ]);

  const dataWithStock = data.map((pp) => ({
    ...pp,
    totalStock: pp.preparedProductStocks.reduce((sum, stock) => sum + Number(stock.quantity), 0),
  }));

  return {
    data: dataWithStock,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSinglePreparedProduct = async (id: string, accountId: string) => {
  const preparedProduct = await prisma.preparedProduct.findFirst({
    where: {
      id,
      accountId,
      isDeleted: false,
    },
    include: {
      unit: true,
      preparedProductItems: {
        include: {
          rawProduct: {
            include: {
              unit: true,
            },
          },
        },
      },
      preparedProductStocks: {
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!preparedProduct) {
    throw new Error("Prepared product not found");
  }

  const totalStock = preparedProduct.preparedProductStocks.reduce(
    (sum, stock) => sum + Number(stock.quantity),
    0,
  );

  return {
    ...preparedProduct,
    totalStock,
  };
};
const updatePreparedProduct = async (
  id: string,
  accountId: string,
  data: UpdatePreparedProductInput,
  userId: string,
) => {
  const existing = await prisma.preparedProduct.findFirst({
    where: {
      id,
      accountId,
      isDeleted: false,
    },
  });

  if (!existing) {
    throw new Error("Prepared product not found");
  }

  const { items, ...productData } = data;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (items && items.length > 0) {
      const rawProductIds = items.map((item) => item.rawProductId);

      const rawProducts = await tx.rawProduct.findMany({
        where: {
          id: {
            in: rawProductIds,
          },
          accountId,
          isDeleted: false,
        },
      });

      if (rawProducts.length !== rawProductIds.length) {
        throw new Error("One or more raw products not found");
      }

      await tx.preparedProductItem.deleteMany({
        where: {
          preparedProductId: id,
        },
      });

      await tx.preparedProductItem.createMany({
        data: items.map((item) => ({
          preparedProductId: id,
          rawProductId: item.rawProductId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
    }

    return tx.preparedProduct.update({
      where: {
        id,
      },
      data: {
        ...productData,
      },
      include: {
        unit: true,
        preparedProductItems: {
          include: {
            rawProduct: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PREPARED_PRODUCT,
    action: SystemAction.UPDATE,
    details: `Updated prepared product: ${updated.name}`,
    accountId,
  });

  return updated;
};

const deletePreparedProduct = async (id: string, accountId: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const preparedProduct = await tx.preparedProduct.findFirst({
      where: {
        id,
        accountId,
        isDeleted: false,
      },
    });

    if (!preparedProduct) {
      throw new Error("Prepared product not found");
    }

    const activeStock = await tx.preparedProductStock.count({
      where: {
        preparedProductId: id,
        isDeleted: false,
        quantity: {
          gt: 0,
        },
      },
    });

    if (activeStock > 0) {
      throw new Error("Cannot delete prepared product with active stock. Clear stock first.");
    }

    await tx.preparedProductItem.deleteMany({
      where: {
        preparedProductId: id,
      },
    });

    const result = await tx.preparedProduct.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.PREPARED_PRODUCT,
      itemName: preparedProduct.name,
      itemId: preparedProduct.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PREPARED_PRODUCT,
      action: SystemAction.DELETE,
      details: `Deleted prepared product: ${preparedProduct.name}`,
      accountId,
    });

    return result;
  });
};

const produceStock = async (
  id: string,
  accountId: string,
  userId: string,
  quantity: number,
  expiryDate?: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const preparedProduct = await tx.preparedProduct.findFirst({
      where: { id, accountId, isDeleted: false },
      include: {
        preparedProductItems: { include: { rawProduct: true } },
      },
    });
    if (!preparedProduct) throw new Error("Prepared product not found");

    let costPerUnit = 0;

    for (const item of preparedProduct.preparedProductItems) {
      const requiredQty = Number(item.quantity) * quantity;

      const rawProduct = await tx.rawProduct.findFirst({
        where: { id: item.rawProductId, accountId, isDeleted: false },
      });
      if (!rawProduct) throw new Error(`Raw product not found: ${item.rawProductId}`);

      if (Number(rawProduct.totalStock) < requiredQty) {
        throw new Error(
          `Insufficient stock for raw product: ${rawProduct.name}. Required: ${requiredQty}, Available: ${rawProduct.totalStock}`,
        );
      }

      costPerUnit += Number(rawProduct.averageCost) * Number(item.quantity);

      await tx.rawProduct.update({
        where: { id: item.rawProductId },
        data: { totalStock: { decrement: requiredQty } },
      });

      const rawStocks = await tx.rawProductStock.findMany({
        where: {
          rawProductId: item.rawProductId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      let remaining = requiredQty;
      for (const stock of rawStocks) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(stock.quantity));
        await tx.rawProductStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deduct } },
        });
        remaining -= deduct;
      }
    }

    const newStock = await tx.preparedProductStock.create({
      data: {
        preparedProductId: id,
        accountId,
        quantity,
        costPerUnit,
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      },
    });

    await tx.preparedProduct.update({
      where: { id },
      data: { rawMaterialCost: costPerUnit },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PREPARED_PRODUCT,
      action: SystemAction.STOCK_IN,
      details: `Produced ${quantity} units of ${preparedProduct.name} at ${costPerUnit.toFixed(2)}/unit`,
      accountId,
    });

    return newStock;
  });
};

export const PreparedProductService = {
  createPreparedProduct,
  getAllPreparedProducts,
  getSinglePreparedProduct,
  updatePreparedProduct,
  deletePreparedProduct,
  produceStock,
};
