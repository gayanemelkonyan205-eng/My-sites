import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessSuperAdmin, hasMinimumRole } from "./authorization";

describe("role authorization", () => {
  it("keeps the role hierarchy STUDENT < ADMIN < SUPER_ADMIN", () => {
    expect(hasMinimumRole("STUDENT", "STUDENT")).toBe(true);
    expect(hasMinimumRole("STUDENT", "ADMIN")).toBe(false);
    expect(hasMinimumRole("ADMIN", "STUDENT")).toBe(true);
    expect(hasMinimumRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(hasMinimumRole("SUPER_ADMIN", "ADMIN")).toBe(true);
  });

  it("restricts admin and super-admin surfaces correctly", () => {
    expect(canAccessAdmin("STUDENT")).toBe(false);
    expect(canAccessAdmin("ADMIN")).toBe(true);
    expect(canAccessAdmin("SUPER_ADMIN")).toBe(true);
    expect(canAccessSuperAdmin("ADMIN")).toBe(false);
    expect(canAccessSuperAdmin("SUPER_ADMIN")).toBe(true);
  });
});
