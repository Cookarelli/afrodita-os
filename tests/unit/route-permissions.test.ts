import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  permissionForPath,
  safeRedirectPath,
} from "../../src/lib/auth/route-permissions";

const salesContext = {
  profileActive: true,
  organizationMembershipActive: true,
  roles: ["sales_manager"] as const,
};

describe("route authorization", () => {
  it("maps sensitive routes before broad shells", () => {
    expect(permissionForPath("/os/users/123")).toBe("manage_users");
    expect(permissionForPath("/os/customers/123")).toBe("view_customers");
    expect(permissionForPath("/property-manager/team")).toBe("manage_property_manager_team");
  });

  it("denies sales users access to user administration", () => {
    expect(canAccessPath(salesContext, "/os/inventory")).toBe(true);
    expect(canAccessPath(salesContext, "/os/users")).toBe(false);
  });

  it("prevents external and encoded redirect targets", () => {
    expect(safeRedirectPath("https://evil.example", "/os")).toBe("/os");
    expect(safeRedirectPath("//evil.example", "/os")).toBe("/os");
    expect(safeRedirectPath("/%2f%2fevil.example", "/os")).toBe("/os");
    expect(safeRedirectPath("/property-manager?tab=open", "/os")).toBe(
      "/property-manager?tab=open",
    );
  });
});
