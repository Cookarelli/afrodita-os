import { describe, expect, it } from "vitest";
import { canViewCosts, isReadOnlyRole } from "../../src/lib/roles";

describe("role boundaries", () => {
  it("limits cost visibility to the two full administrative roles", () => {
    expect(canViewCosts("super_admin")).toBe(true);
    expect(canViewCosts("owner_admin")).toBe(true);
    expect(canViewCosts("sales_manager")).toBe(false);
    expect(canViewCosts("delivery_technician")).toBe(false);
  });

  it("marks investors as read-only", () => {
    expect(isReadOnlyRole("investor_viewer")).toBe(true);
    expect(isReadOnlyRole("owner_admin")).toBe(false);
  });
});
