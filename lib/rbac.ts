// Role-Based Access Control (RBAC) for Saree Pro
// Manages user permissions and access control

export type UserRole = 'customer' | 'driver' | 'merchant' | 'admin' | 'staff' | 'moderator' | 'support';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: 'orders' | 'users' | 'payments' | 'content' | 'analytics' | 'settings' | 'support' | 'drivers' | 'merchants';
}

export interface Role {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  hierarchy: number; // Higher number = more privileges
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

// Define all available permissions
export const PERMISSIONS: Permission[] = [
  // Orders
  { id: 'orders.create', name: 'Create Order', description: 'Create new orders', resource: 'orders', action: 'create', category: 'orders' },
  { id: 'orders.read', name: 'View Orders', description: 'View order details', resource: 'orders', action: 'read', category: 'orders' },
  { id: 'orders.update', name: 'Update Order', description: 'Update order status', resource: 'orders', action: 'update', category: 'orders' },
  { id: 'orders.delete', name: 'Delete Order', description: 'Cancel/delete orders', resource: 'orders', action: 'delete', category: 'orders' },
  { id: 'orders.assign', name: 'Assign Orders', description: 'Assign orders to drivers', resource: 'orders', action: 'assign', category: 'orders' },

  // Users
  { id: 'users.create', name: 'Create User', description: 'Create new users', resource: 'users', action: 'create', category: 'users' },
  { id: 'users.read', name: 'View Users', description: 'View user profiles', resource: 'users', action: 'read', category: 'users' },
  { id: 'users.update', name: 'Update User', description: 'Update user information', resource: 'users', action: 'update', category: 'users' },
  { id: 'users.delete', name: 'Delete User', description: 'Delete user accounts', resource: 'users', action: 'delete', category: 'users' },

  // Payments
  { id: 'payments.create', name: 'Process Payment', description: 'Process payments', resource: 'payments', action: 'create', category: 'payments' },
  { id: 'payments.read', name: 'View Payments', description: 'View payment history', resource: 'payments', action: 'read', category: 'payments' },
  { id: 'payments.refund', name: 'Refund Payment', description: 'Process refunds', resource: 'payments', action: 'refund', category: 'payments' },
  { id: 'payments.escrow', name: 'Manage Escrow', description: 'Manage escrow accounts', resource: 'payments', action: 'escrow', category: 'payments' },

  // Content
  { id: 'content.create', name: 'Create Content', description: 'Create menu items, categories', resource: 'content', action: 'create', category: 'content' },
  { id: 'content.read', name: 'View Content', description: 'View menu items', resource: 'content', action: 'read', category: 'content' },
  { id: 'content.update', name: 'Update Content', description: 'Update menu items', resource: 'content', action: 'update', category: 'content' },
  { id: 'content.delete', name: 'Delete Content', description: 'Delete menu items', resource: 'content', action: 'delete', category: 'content' },

  // Analytics
  { id: 'analytics.read', name: 'View Analytics', description: 'View analytics reports', resource: 'analytics', action: 'read', category: 'analytics' },
  { id: 'analytics.export', name: 'Export Data', description: 'Export analytics data', resource: 'analytics', action: 'export', category: 'analytics' },

  // Settings
  { id: 'settings.read', name: 'View Settings', description: 'View system settings', resource: 'settings', action: 'read', category: 'settings' },
  { id: 'settings.update', name: 'Update Settings', description: 'Update system settings', resource: 'settings', action: 'update', category: 'settings' },

  // Support
  { id: 'support.create', name: 'Create Ticket', description: 'Create support tickets', resource: 'support', action: 'create', category: 'support' },
  { id: 'support.read', name: 'View Tickets', description: 'View support tickets', resource: 'support', action: 'read', category: 'support' },
  { id: 'support.update', name: 'Update Ticket', description: 'Update support tickets', resource: 'support', action: 'update', category: 'support' },
  { id: 'support.resolve', name: 'Resolve Ticket', description: 'Resolve support tickets', resource: 'support', action: 'resolve', category: 'support' },

  // Drivers
  { id: 'drivers.create', name: 'Create Driver', description: 'Create driver accounts', resource: 'drivers', action: 'create', category: 'drivers' },
  { id: 'drivers.read', name: 'View Drivers', description: 'View driver profiles', resource: 'drivers', action: 'read', category: 'drivers' },
  { id: 'drivers.update', name: 'Update Driver', description: 'Update driver information', resource: 'drivers', action: 'update', category: 'drivers' },
  { id: 'drivers.verify', name: 'Verify Driver', description: 'Verify driver documents', resource: 'drivers', action: 'verify', category: 'drivers' },

  // Merchants
  { id: 'merchants.create', name: 'Create Merchant', description: 'Create merchant accounts', resource: 'merchants', action: 'create', category: 'merchants' },
  { id: 'merchants.read', name: 'View Merchants', description: 'View merchant profiles', resource: 'merchants', action: 'read', category: 'merchants' },
  { id: 'merchants.update', name: 'Update Merchant', description: 'Update merchant information', resource: 'merchants', action: 'update', category: 'merchants' },
  { id: 'merchants.approve', name: 'Approve Merchant', description: 'Approve merchant applications', resource: 'merchants', action: 'approve', category: 'merchants' },
];

// Define system roles
export const ROLES: Role[] = [
  {
    id: 'customer',
    name: 'Customer',
    description: 'Regular customer who can place orders and manage their profile',
    permissions: [
      'orders.create',
      'orders.read',
      'orders.update', // Update own orders
      'payments.create', // Make payments
      'payments.read', // View own payment history
    ],
    isSystem: true,
    hierarchy: 1,
  },
  {
    id: 'driver',
    name: 'Driver',
    description: 'Delivery driver who can manage orders and earnings',
    permissions: [
      'orders.read',
      'orders.update',
      'orders.assign',
      'payments.read', // View earnings
      'drivers.read', // View own profile
      'drivers.update', // Update own profile
    ],
    isSystem: true,
    hierarchy: 2,
  },
  {
    id: 'merchant',
    name: 'Merchant',
    description: 'Restaurant owner who can manage menu and orders',
    permissions: [
      'orders.read',
      'orders.update',
      'content.create',
      'content.read',
      'content.update',
      'content.delete',
      'analytics.read',
      'payments.read', // View sales data
      'support.create', // Create support tickets
      'support.read',
      'support.update',
    ],
    isSystem: true,
    hierarchy: 3,
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Support staff with limited administrative access',
    permissions: [
      'orders.read',
      'orders.update',
      'users.read',
      'payments.read',
      'support.create',
      'support.read',
      'support.update',
      'support.resolve',
    ],
    isSystem: true,
    hierarchy: 4,
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Content moderator who can manage user-generated content',
    permissions: [
      'users.read',
      'users.update',
      'content.read',
      'content.update',
      'content.delete',
      'support.create',
      'support.read',
      'support.update',
      'support.resolve',
    ],
    isSystem: true,
    hierarchy: 5,
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Customer support agent',
    permissions: [
      'orders.read',
      'orders.update',
      'users.read',
      'payments.read',
      'support.create',
      'support.read',
      'support.update',
      'support.resolve',
    ],
    isSystem: true,
    hierarchy: 4,
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'System administrator with full access',
    permissions: PERMISSIONS.map(p => p.id), // All permissions
    isSystem: true,
    hierarchy: 10,
  },
];

export class RBACService {
  private userPermissions: Map<string, UserPermission> = new Map();
  private roleHierarchy: Map<UserRole, number> = new Map();

  constructor() {
    // Initialize role hierarchy
    ROLES.forEach(role => {
      this.roleHierarchy.set(role.id, role.hierarchy);
    });
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userId: string, permissionId: string): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    return userPerm.permissions.includes(permissionId) || 
           userPerm.customPermissions?.includes(permissionId) || false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(userId: string, permissionIds: string[]): boolean {
    return permissionIds.some(permissionId => this.hasPermission(userId, permissionId));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(userId: string, permissionIds: string[]): boolean {
    return permissionIds.every(permissionId => this.hasPermission(userId, permissionId));
  }

  /**
   * Check if user can access resource with specific action
   */
  canAccess(userId: string, resource: string, action: string): AccessControl {
    const permissionId = `${resource}.${action}`;
    const hasPermission = this.hasPermission(userId, permissionId);

    if (!hasPermission) {
      return {
        resource,
        action,
        granted: false,
        reason: 'Permission not granted',
      };
    }

    // Check additional restrictions
    const userPerm = this.userPermissions.get(userId);
    if (userPerm?.restrictions) {
      // Check time restrictions
      if (userPerm.restrictions.timeRestrictions) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        const { startHour, endHour, daysOfWeek } = userPerm.restrictions.timeRestrictions;
        
        if (daysOfWeek && !daysOfWeek.includes(currentDay)) {
          return {
            resource,
            action,
            granted: false,
            reason: 'Access restricted to specific days',
          };
        }

        if (startHour !== undefined && endHour !== undefined) {
          if (currentHour < startHour || currentHour > endHour) {
            return {
              resource,
              action,
              granted: false,
              reason: `Access restricted to ${startHour}:00 - ${endHour}:00`,
            };
          }
        }
      }

      // Check location restrictions
      if (userPerm.restrictions.locationRestrictions && userPerm.restrictions.locationRestrictions.length > 0) {
        // This would need to be implemented based on user location
        // For now, we'll assume access is granted
      }
    }

    return {
      resource,
      action,
      granted: true,
    };
  }

  /**
   * Check if user has higher or equal role hierarchy
   */
  hasMinimumRole(userId: string, minimumRole: UserRole): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    const userHierarchy = this.roleHierarchy.get(userPerm.roleId) || 0;
    const requiredHierarchy = this.roleHierarchy.get(minimumRole) || 0;

    return userHierarchy >= requiredHierarchy;
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): string[] {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return [];

    return [...userPerm.permissions, ...(userPerm.customPermissions || [])];
  }

  /**
   * Get role information
   */
  getRole(roleId: UserRole): Role | undefined {
    return ROLES.find(role => role.id === roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return [...ROLES];
  }

  /**
   * Get available permissions
   */
  getAvailablePermissions(): Permission[] {
    return [...PERMISSIONS];
  }

  /**
   * Get permissions by category
   */
  getPermissionsByCategory(category: Permission['category']): Permission[] {
    return PERMISSIONS.filter(permission => permission.category === category);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: UserRole, customPermissions?: string[]): Promise<void> {
    const role = this.getRole(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    const userPermission: UserPermission = {
      userId,
      roleId,
      permissions: role.permissions,
      customPermissions,
    };

    this.userPermissions.set(userId, userPermission);

    // Save to database
    await this.saveUserPermission(userPermission);
  }

  /**
   * Add custom permission to user
   */
  async addCustomPermission(userId: string, permissionId: string): Promise<void> {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return;

    if (!userPerm.customPermissions) {
      userPerm.customPermissions = [];
    }

    if (!userPerm.customPermissions.includes(permissionId)) {
      userPerm.customPermissions.push(permissionId);
      this.userPermissions.set(userId, userPerm);
      await this.saveUserPermission(userPerm);
    }
  }

  /**
   * Remove custom permission from user
   */
  async removeCustomPermission(userId: string, permissionId: string): Promise<void> {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm || !userPerm.customPermissions) return;

    userPerm.customPermissions = userPerm.customPermissions.filter(p => p !== permissionId);
    this.userPermissions.set(userId, userPerm);
    await this.saveUserPermission(userPerm);
  }

  /**
   * Set user restrictions
   */
  async setUserRestrictions(userId: string, restrictions: UserPermission['restrictions']): Promise<void> {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return;

    userPerm.restrictions = restrictions;
    this.userPermissions.set(userId, userPerm);
    await this.saveUserPermission(userPerm);
  }

  /**
   * Load user permissions from storage
   */
  async loadUserPermissions(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/rbac/permissions/${userId}`);
      const userPermission: UserPermission = await response.json();
      
      if (userPermission) {
        this.userPermissions.set(userId, userPermission);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
    }
  }

  /**
   * Save user permission to storage
   */
  private async saveUserPermission(userPermission: UserPermission): Promise<void> {
    try {
      await fetch('/api/rbac/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPermission),
      });
    } catch (error) {
      console.error('Failed to save user permissions:', error);
    }
  }

  /**
   * Create new custom role
   */
  async createCustomRole(role: Omit<Role, 'id' | 'isSystem' | 'hierarchy'>): Promise<Role> {
    const newRole: Role = {
      ...role,
      id: `custom_${Date.now()}`, // Generate unique ID
      isSystem: false,
      hierarchy: 3, // Default hierarchy level
    };

    // In a real implementation, save to database
    return newRole;
  }

  /**
   * Audit user access
   */
  async auditAccess(userId: string, resource: string, action: string, granted: boolean): Promise<void> {
    const auditLog = {
      userId,
      resource,
      action,
      granted,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ip: '', // Would be filled by server
    };

    try {
      await fetch('/api/rbac/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditLog),
      });
    } catch (error) {
      console.error('Failed to log access audit:', error);
    }
  }
}

// Singleton instance
export const rbacService = new RBACService();

// Utility functions
export function getRoleDisplayName(roleId: UserRole): string {
  const role = rbacService.getRole(roleId);
  return role ? role.name : roleId;
}

export function getPermissionCategoryName(category: Permission['category']): string {
  const names: Record<Permission['category'], string> = {
    orders: 'Orders',
    users: 'Users',
    payments: 'Payments',
    content: 'Content',
    analytics: 'Analytics',
    settings: 'Settings',
    support: 'Support',
    drivers: 'Drivers',
    merchants: 'Merchants',
  };
  
  return names[category] || category;
}

export function canPerformAction(
  userId: string,
  requiredRole: UserRole,
  currentUserRole: UserRole
): boolean {
  const userHierarchy = rbacService.getRole(currentUserRole)?.hierarchy || 0;
  const requiredHierarchy = rbacService.getRole(requiredRole)?.hierarchy || 0;
  
  return userHierarchy >= requiredHierarchy;
}
