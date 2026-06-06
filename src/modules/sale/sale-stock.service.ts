import type { Prisma } from "../../generated/prisma/index.js";

type SaleStockItem = {
	productId?: string | null;
	unitId?: string | null;
	quantity: number | string | { toString(): string };
	purchasePrice?: number | string | { toString(): string } | null;
};

const toNumber = (value: number | string | { toString(): string } | null | undefined) =>
	Number(value ?? 0);

export const deductSaleItemsStock = async (
	tx: Prisma.TransactionClient,
	items: SaleStockItem[],
	accountId: string,
) => {
	for (const item of items) {
		if (!item.productId) continue;

		let remaining = toNumber(item.quantity);

		const stocks = await tx.productStock.findMany({
			where: {
				productId: item.productId,
				accountId,
				isDeleted: false,
				quantity: { gt: 0 },
			},
			orderBy: { createdAt: "asc" },
		});

		for (const stock of stocks) {
			if (remaining <= 0) break;

			const deduct = Math.min(remaining, Number(stock.quantity));
			await tx.productStock.update({
				where: { id: stock.id },
				data: { quantity: { decrement: deduct } },
			});
			remaining -= deduct;
		}

		if (remaining > 0) {
			throw new Error(`Insufficient stock for product: ${item.productId}`);
		}
	}
};

export const readdSaleItemsStock = async (
	tx: Prisma.TransactionClient,
	items: SaleStockItem[],
	accountId: string,
) => {
	for (const item of items) {
		if (!item.productId) continue;

		const quantity = toNumber(item.quantity);
		if (quantity <= 0) continue;

		const product = await tx.product.findFirst({
			where: { id: item.productId, accountId },
		});
		if (!product) throw new Error(`Product not found: ${item.productId}`);

		const unitId = item.unitId ?? product.unitId;
		const purchasePrice = toNumber(item.purchasePrice);

		const stock = await tx.productStock.findFirst({
			where: {
				productId: item.productId,
				unitId,
				accountId,
				isDeleted: false,
			},
			orderBy: { createdAt: "desc" },
		});

		if (stock) {
			await tx.productStock.update({
				where: { id: stock.id },
				data: { quantity: { increment: quantity } },
			});
			continue;
		}

		await tx.productStock.create({
			data: {
				productId: item.productId,
				unitId,
				quantity,
				purchasePrice,
				rate: 0,
				totalCost: quantity * purchasePrice,
				accountId,
			},
		});
	}
};
