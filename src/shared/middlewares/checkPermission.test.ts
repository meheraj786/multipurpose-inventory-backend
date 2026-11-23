import { describe, expect, it } from "vitest";
import { getRequiredAction } from "./checkPermission.js";

describe("getRequiredAction", () => {
  it("recognizes restore routes with an id after the action", () => {
    expect(getRequiredAction({ method: "POST", path: "/restore/record-id" })).toBe("RESTORE");
  });

  it("requires update permission to record a payment", () => {
    expect(getRequiredAction({ method: "POST", path: "/purchase-id/payments" })).toBe("UPDATE");
    expect(getRequiredAction({ method: "GET", path: "/purchase-id/payments" })).toBe("READ");
  });
});
