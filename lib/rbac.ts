// Role-Based Access Control (RBAC) for Saree Pro
// Read-only role and permission helpers used by the workspace and admin tools.

export type UserRole =
  | "customer"
  | "driver"
  | "merchant"
  | "admin"
  | "staff"
  | "moderator"
  | "support";

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category:
    | "orders"
    | "users"
    | "payments"
    | "content"
    | "analytics"
    | "settings"
    | "support"
    | "drivers"
    | "merchants";
}

export interface Role {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  hierarchy: number;
}

export interface UserPermission {
  userId: string;
  roleId: UserRole;
  permissions: string[];
  customPermissions?: string[];
  restrictions?: {
    canAccessAllMerchants?: boolean;
    canAccessAllOrders?: boolean;
    maxOrderValue?: number;
    timeRestrictions?: {
      startHour?: number;
      endHour?: number;
      daysOfWeek?: number[];
    };
    locationRestrictions?: string[];
  };
}

export interface AccessControl {
  resource: string;
  action: string;
  granted: boolean;
  reason?: string;
}

export const PERMISSIONS: Permission[] = [
  { id: "orders.create", name: "Create Order", description: "Create new orders", resource: "orders", action: "create", category: "orders" },
  { id: "orders.read", name: "View Orders", description: "View order details", resource: "orders", action: "read", category: "orders" },
  { id: "orders.update", name: "Update Order", description: "Update order status", resource: "orders", action: "update", category: "orders" },
  { id: "orders.delete", name: "Delete Order", description: "Cancel or delete orders", resource: "orders", action: "delete", category: "orders" },
  { id: "orders.assign", name: "Assign Orders", description: "Assign orders to drivers", resource: "orders", action: "assign", category: "orders" },
  { id: "users.create", name: "Create User", description: "Create new users", resource: "users", action: "create", category: "users" },
  { id: "users.read", name: "View Users", description: "View user profiles", resource: "users", action: "read", category: "users" },
  { id: "users.update", name: "Update User", description: "Update user information", resource: "users", action: "update", category: "users" },
  { id: "users.delete", name: "Delete User", description: "Delete user accounts", resource: "users", action: "delete", category: "users" },
  { id: "payments.create", name: "Process Payment", description: "Process payments", resource: "payments", action: "create", category: "payments" },
  { id: "payments.read", name: "View Payments", description: "View payment history", resource: "payments", action: "read", category: "payments" },
  { id: "payments.refund", name: "Refund Payment", description: "Process refunds", resource: "payments", action: "refund", category: "payments" },
  { id: "payments.escrow", name: "Manage Escrow", description: "Manage escrow accounts", resource: "payments", action: "escrow", category: "payments" },
  { id: "content.create", name: "Create Content", description: "Create menu items and categories", resource: "content", action: "create", category: "content" },
  { id: "content.read", name: "View Content", description: "View menu items", resource: "content", action: "read", category: "content" },
  { id: "content.update", name: "Update Content", description: "Update menu items", resource: "content", action: "update", category: "content" },
  { id: "content.delete", name: "Delete Content", description: "Delete menu items", resource: "content", action: "delete", category: "content" },
  { id: "analytics.read", name: "View Analytics", description: "View analytics reports", resource: "analytics", action: "read", category: "analytics" },
  { id: "analytics.export", name: "Export Data", description: "Export analytics data", resource: "analytics", action: "export", category: "analytics" },
  { id: "settings.read", name: "View Settings", description: "View system settings", resource: "settings", action: "read", category: "settings" },
  { id: "settings.update", name: "Update Settings", description: "Update system settings", resource: "settings", action: "update", category: "settings" },
  { id: "support.create", name: "Create Ticket", description: "Create support tickets", resource: "support", action: "create", category: "support" },
  { id: "support.read", name: "View Tickets", description: "View support tickets", resource: "support", action: "read", category: "support" },
  { id: "support.update", name: "Update Ticket", description: "Update support tickets", resource: "support", action: "update", category: "support" },
  { id: "support.resolve", name: "Resolve Ticket", description: "Resolve support tickets", resource: "support", action: "resolve", category: "support" },
  { id: "drivers.create", name: "Create Driver", description: "Create driver accounts", resource: "drivers", action: "create", category: "drivers" },
  { id: "drivers.read", name: "View Drivers", description: "View driver profiles", resource: "drivers", action: "read", category: "drivers" },
  { id: "drivers.update", name: "Update Driver", description: "Update driver information", resource: "drivers", action: "update", category: "drivers" },
  { id: "drivers.verify", name: "Verify Driver", description: "Verify driver documents", resource: "drivers", action: "verify", category: "drivers" },
  { id: "merchants.create", name: "Create Merchant", description: "Create merchant accounts", resource: "merchants", action: "create", category: "merchants" },
  { id: "merchants.read", name: "View Merchants", description: "View merchant profiles", resource: "merchants", action: "read", category: "merchants" },
  { id: "merchants.update", name: "Update Merchant", description: "Update merchant information", resource: "merchants", action: "update", category: "merchants" },
  { id: "merchants.approve", name: "Approve Merchant", description: "Approve merchant applications", resource: "merchants", action: "approve", category: "merchants" },
];

export const ROLES: Role[] = [
  {
    id: "customer",
    name: "Customer",
    description: "Regular customer who can place orders and manage their profile",
    permissions: ["orders.create", "orders.read", "orders.update", "payments.create", "payments.read"],
    isSystem: true,
    hierarchy: 1,
  },
  {
    id: "driver",
    name: "Driver",
    description: "Delivery driver who can manage assigned orders and earnings",
    permissions: ["orders.read", "orders.update", "orders.assign", "payments.read", "drivers.read", "drivers.update"],
    isSystem: true,
    hierarchy: 2,
  },
  {
    id: "merchant",
    name: "Merchant",
    description: "Restaurant owner who can manage menu, orders, and sales visibility",
    permissions: [
      "orders.read",
      "orders.update",
      "content.create",
      "content.read",
      "content.update",
      "content.delete",
      "analytics.read",
      "payments.read",
      "support.create",
      "support.read",
      "support.update",
    ],
    isSystem: true,
    hierarchy: 3,
  },
  {
    id: "staff",
    name: "Staff",
    description: "Internal staff with limited operational permissions",
    permissions: ["orders.read", "orders.update", "users.read", "payments.read", "support.create", "support.read", "support.update", "support.resolve"],
    isSystem: true,
    hierarchy: 4,
  },
  {
    id: "support",
    name: "Support Agent",
    description: "Customer support agent focused on operational and user issues",
    permissions: ["orders.read", "orders.update", "users.read", "payments.read", "support.create", "support.read", "support.update", "support.resolve"],
    isSystem: true,
    hierarchy: 4,
  },
  {
    id: "moderator",
    name: "Moderator",
    description: "Content moderator who can oversee user-generated content and support queues",
    permissions: ["users.read", "users.update", "content.read", "content.update", "content.delete", "support.create", "support.read", "support.update", "support.resolve"],
    isSystem: true,
    hierarchy: 5,
  },
  {
    id: "admin",
    name: "Administrator",
    description: "System administrator with platform-wide access",
    permissions: PERMISSIONS.map((permission) => permission.id),
    isSystem: true,
    hierarchy: 10,
  },
];

const roleMap = new Map(ROLES.map((role) => [role.id, role]));

export function getRole(roleId: UserRole): Role | undefined {
  return roleMap.get(roleId);
}

export function getAllRoles(): Role[] {
  return [...ROLES];
}

export function getAvailablePermissions(): Permission[] {
  return [...PERMISSIONS];
}

export function getPermissionsByCategory(category: Permission["category"]): Permission[] {
  return PERMISSIONS.filter((permission) => permission.category === category);
}

export function createUserPermissionSnapshot(
  userId: string,
  roleId: UserRole,
  customPermissions: string[] = [],
  restrictions?: UserPermission["restrictions"],
): UserPermission {
  const role = getRole(roleId) ?? ROLES[0];
  return {
    userId,
    roleId,
    permissions: role.permissions,
    customPermissions,
    restrictions,
  };
}

export function getUserPermissions(snapshot: UserPermission): string[] {
  return [...snapshot.permissions, ...(snapshot.customPermissions ?? [])];
}

export function hasPermission(snapshot: UserPermission, permissionId: string): boolean {
  return getUserPermissions(snapshot).includes(permissionId);
}

export function hasAnyPermission(snapshot: UserPermission, permissionIds: string[]): boolean {
  return permissionIds.some((permissionId) => hasPermission(snapshot, permissionId));
}

export function hasAllPermissions(snapshot: UserPermission, permissionIds: string[]): boolean {
  return permissionIds.every((permissionId) => hasPermission(snapshot, permissionId));
}

export function canAccess(
  snapshot: UserPermission,
  resource: string,
  action: string,
  now = new Date(),
): AccessControl {
  const permissionId = `${resource}.${action}`;

  if (!hasPermission(snapshot, permissionId)) {
    return {
      resource,
      action,
      granted: false,
      reason: "Permission not granted",
    };
  }

  const restrictions = snapshot.restrictions;
  if (!restrictions?.timeRestrictions) {
    return { resource, action, granted: true };
  }

  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const { startHour, endHour, daysOfWeek } = restrictions.timeRestrictions;

  if (daysOfWeek && !daysOfWeek.includes(currentDay)) {
    return {
      resource,
      action,
      granted: false,
      reason: "Access restricted to specific days",
    };
  }

  if (
    startHour !== undefined &&
    endHour !== undefined &&
    (currentHour < startHour || currentHour > endHour)
  ) {
    return {
      resource,
      action,
      granted: false,
      reason: `Access restricted to ${startHour}:00 - ${endHour}:00`,
    };
  }

  return { resource, action, granted: true };
}

export function hasMinimumRole(currentRole: UserRole, minimumRole: UserRole): boolean {
  const currentHierarchy = getRole(currentRole)?.hierarchy ?? 0;
  const minimumHierarchy = getRole(minimumRole)?.hierarchy ?? 0;
  return currentHierarchy >= minimumHierarchy;
}

export function getRoleDisplayName(roleId: UserRole): string {
  return getRole(roleId)?.name ?? roleId;
}

export function getPermissionCategoryName(category: Permission["category"]): string {
  const names: Record<Permission["category"], string> = {
    orders: "Orders",
    users: "Users",
    payments: "Payments",
    content: "Content",
    analytics: "Analytics",
    settings: "Settings",
    support: "Support",
    drivers: "Drivers",
    merchants: "Merchants",
  };

  return names[category];
}

export function canPerformAction(
  requiredRole: UserRole,
  currentUserRole: UserRole,
): boolean {
  return hasMinimumRole(currentUserRole, requiredRole);
}

export const rbacService = {
  getRole,
  getAllRoles,
  getAvailablePermissions,
  getPermissionsByCategory,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccess,
  hasMinimumRole,
  createUserPermissionSnapshot,
};
