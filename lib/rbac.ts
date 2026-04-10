import { requireSessionUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

// Permission definitions
export const PERMISSIONS = {
  // Orders
  'orders.read': ['customer', 'merchant', 'driver', 'admin', 'owner'],
  'orders.create': ['customer'],
  'orders.update': ['merchant', 'driver', 'admin', 'owner'],
  'orders.cancel': ['customer', 'merchant', 'admin', 'owner'],
  'orders.assign': ['admin', 'owner'],
  
  // Payments
  'payments.read': ['customer', 'merchant', 'admin', 'owner'],
  'payments.create': ['customer'],
  'payments.settle': ['admin', 'owner'],
  'payments.refund': ['admin', 'owner'],
  
  // Merchants
  'merchants.read': ['customer', 'merchant', 'admin', 'owner'],
  'merchants.create': ['merchant', 'admin', 'owner'],
  'merchants.update': ['merchant', 'admin', 'owner'],
  'merchants.delete': ['admin', 'owner'],
  
  // Drivers
  'drivers.read': ['driver', 'admin', 'owner'],
  'drivers.verify': ['admin', 'owner'],
  'drivers.assign': ['admin', 'owner'],
  
  // Finance
  'finance.read': ['admin', 'owner'],
  'finance.export': ['admin', 'owner'],
  'finance.manage': ['admin', 'owner'],
  
  // Users
  'users.read': ['admin', 'owner'],
  'users.update': ['admin', 'owner'],
  'users.delete': ['owner'],
  
  // Owner
  'owner.access': ['owner'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export async function requirePermission(permission: Permission) {
  const session = await requireSessionUser();
  
  const allowedRoles = PERMISSIONS[permission];
  
  if (!allowedRoles.some((role) => role === session.role)) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions', required: permission, role: session.role },
      { status: 403 }
    );
  }

  return null; // Permission granted
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSessionUser();
  
  if (!roles.includes(session.role)) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient role', required: roles, role: session.role },
      { status: 403 }
    );
  }

  return null; // Role granted
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.some((allowedRole) => allowedRole === role);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function getAvailablePermissions(): Permission[] {
  return Object.keys(PERMISSIONS) as Permission[];
}

export function getPermissionCategoryName(permission: string): string {
  const [category] = permission.split('.');
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getRole(roleName: string): UserRole | null {
  const validRoles: UserRole[] = ['customer', 'merchant', 'driver', 'admin', 'owner'];
  return validRoles.some((role) => role === roleName) ? (roleName as UserRole) : null;
}

export type UserPermission = {
  permission: Permission;
  allowed: boolean;
};

export function createUserPermissionSnapshot(role: UserRole): UserPermission[] {
  return getAvailablePermissions().map(permission => ({
    permission,
    allowed: hasPermission(role, permission),
  }));
}
