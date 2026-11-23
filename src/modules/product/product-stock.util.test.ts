import { describe, expect, it } from "vitest";
import { planFifoStockAllocations } from "./product-stock.util.js";

describe("planFifoStockAllocations", () => {
  it("consumes the oldest batch first and calculates the exact mixed cost", () => {
    const result = planFifoStockAllocations(
      [
        { id: "old", quantity: 3, purchasePrice: "2.50" },
        { id: "new", quantity: 5, purchasePrice: "4.00" },
      ],
      4,
    );

    expect(result.allocations).toEqual([
      { productStockId: "old", quantity: 3, unitCost: 2.5, saleQuantity: 3 },
      { productStockId: "new", quantity: 1, unitCost: 4, saleQuantity: 1 },
    ]);
    expect(result.totalCost).toBe(11.5);
    expect(result.remaining).toBe(0);
  });

  it("preserves fractional quantities and costs", () => {
    const result = planFifoStockAllocations(
      [
        { id: "old", quantity: "0.25", purchasePrice: "0.10" },
        { id: "new", quantity: "0.75", purchasePrice: "0.30" },
      ],
      0.5,
    );

    expect(result.allocations).toEqual([
      { productStockId: "old", quantity: 0.25, unitCost: 0.1, saleQuantity: 0.25 },
      { productStockId: "new", quantity: 0.25, unitCost: 0.3, saleQuantity: 0.25 },
    ]);
    expect(result.totalCost).toBe(0.1);
    expect(result.remaining).toBe(0);
  });

  it("reports any quantity that stock layers cannot fulfill", () => {
    const result = planFifoStockAllocations([{ id: "old", quantity: 2, purchasePrice: 3 }], 3);

    expect(result.allocations).toEqual([
      { productStockId: "old", quantity: 2, unitCost: 3, saleQuantity: 2 },
    ]);
    expect(result.remaining).toBe(1);
    expect(result.totalCost).toBe(6);
  });

  it("converts sale quantities into the units of each FIFO batch", () => {
    const result = planFifoStockAllocations(
      [
        { id: "old-kg", quantity: 1, purchasePrice: 2, unitConversionFactor: 1000 },
        { id: "new-g", quantity: 500, purchasePrice: 0.01, unitConversionFactor: 1 },
      ],
      1500,
      1,
    );

    expect(result.allocations).toEqual([
      { productStockId: "old-kg", quantity: 1, unitCost: 2, saleQuantity: 1000 },
      { productStockId: "new-g", quantity: 500, unitCost: 0.01, saleQuantity: 500 },
    ]);
    expect(result.totalCost).toBe(7);
    expect(result.remaining).toBe(0);
  });
});
