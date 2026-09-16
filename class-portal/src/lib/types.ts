export const ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export type ViewerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};
