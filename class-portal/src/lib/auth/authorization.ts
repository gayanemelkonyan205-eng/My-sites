import type { Role } from "@/lib/types";

const roleRank: Record<Role, number> = {
  STUDENT: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3
};

export function hasMinimumRole(actual: Role, required: Role): boolean {
  return roleRank[actual] >= roleRank[required];
}

export function canAccessAdmin(role: Role): boolean {
  return hasMinimumRole(role, "ADMIN");
}

export function canAccessSuperAdmin(role: Role): boolean {
  return role === "SUPER_ADMIN";
}
