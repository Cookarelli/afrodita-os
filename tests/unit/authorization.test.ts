import { describe, expect, it } from "vitest";
import { hasPermission, type AuthorizationContext, type Role } from "../../src/lib/roles";

function context(role: Role, overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    profileActive: true,
    organizationMembershipActive: true,
    propertyManagerMembershipActive: role.startsWith("property_manager"),
    roles: [role],
    ...overrides,
  };
}

describe("central authorization", () => {
  it("denies unauthenticated and disabled membership contexts", () => {
    expect(hasPermission(context("super_admin", { profileActive: false }), "manage_users")).toBe(
      false,
    );
    expect(
      hasPermission(
        context("owner_admin", { organizationMembershipActive: false }),
        "view_raw_costs",
      ),
    ).toBe(false);
  });

  it("protects raw costs from sales and delivery roles", () => {
    expect(hasPermission(context("sales_manager"), "view_raw_costs")).toBe(false);
    expect(hasPermission(context("delivery_technician"), "view_raw_costs")).toBe(false);
    expect(hasPermission(context("owner_admin"), "view_raw_costs")).toBe(true);
    expect(hasPermission(context("super_admin"), "view_raw_costs")).toBe(true);
  });

  it("keeps investors aggregate-only and read-only", () => {
    const investor = context("investor_viewer");
    expect(hasPermission(investor, "view_investor_summary")).toBe(true);
    expect(hasPermission(investor, "view_inventory")).toBe(false);
    expect(hasPermission(investor, "manage_sales")).toBe(false);
    expect(hasPermission(investor, "manage_users")).toBe(false);
  });

  it("requires active company membership for property-manager roles", () => {
    expect(
      hasPermission(
        context("property_manager_admin", { propertyManagerMembershipActive: false }),
        "property_manager_access",
      ),
    ).toBe(false);
    expect(hasPermission(context("property_manager_admin"), "manage_property_manager_team")).toBe(
      true,
    );
    expect(hasPermission(context("property_manager_staff"), "manage_property_manager_team")).toBe(
      false,
    );
  });

  it("honors deny overrides and never allows raw-cost overrides", () => {
    expect(
      hasPermission(
        context("sales_manager", {
          overrides: [{ permission: "view_sales", effect: "deny" }],
        }),
        "view_sales",
      ),
    ).toBe(false);
    expect(
      hasPermission(
        context("sales_manager", {
          overrides: [{ permission: "view_raw_costs", effect: "allow" }],
        }),
        "view_raw_costs",
      ),
    ).toBe(false);
  });
});
