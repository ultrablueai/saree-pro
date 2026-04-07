'use client';

import { useEffect, useState } from 'react';
import {
  EyeIcon,
  KeyIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { type Permission, rbacService, type Role, type UserPermission } from '../../lib/rbac';
import { cn } from '../../lib/utils';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';

interface RoleManagerProps {
  userId?: string;
  onRoleChange?: (role: Role) => void;
  className?: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: '+',
  read: 'view',
  update: 'edit',
  delete: 'remove',
  assign: 'assign',
  refund: 'refund',
  escrow: 'hold',
  verify: 'check',
  approve: 'ok',
  export: 'csv',
  resolve: 'fix',
};

export function RoleManager({ userId, onRoleChange, className = '' }: RoleManagerProps) {
  useLocalization();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role['id'] | ''>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        setRoles(rbacService.getAllRoles());
        setPermissions(rbacService.getAvailablePermissions());

        if (!userId) {
          setUserPermissions(null);
          setSelectedRole('');
          setCustomPermissions([]);
          return;
        }

        await rbacService.loadUserPermissions(userId);

        const fallbackPermissions: UserPermission = {
          userId,
          roleId: 'customer',
          permissions: ['orders.create', 'orders.read'],
          customPermissions: [],
        };

        setUserPermissions(fallbackPermissions);
        setSelectedRole(fallbackPermissions.roleId);
        setCustomPermissions(fallbackPermissions.customPermissions ?? []);
      } catch (error) {
        console.error('Failed to load role data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [userId]);

  async function handleRoleChange(roleId: Role['id']) {
    if (!userId) {
      return;
    }

    try {
      await rbacService.assignRole(userId, roleId);
      setSelectedRole(roleId);

      const nextRole = rbacService.getRole(roleId);
      if (nextRole) {
        onRoleChange?.(nextRole);
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  }

  async function handlePermissionToggle(permissionId: string) {
    if (!userId) {
      return;
    }

    try {
      if (customPermissions.includes(permissionId)) {
        await rbacService.removeCustomPermission(userId, permissionId);
        setCustomPermissions((previous) => previous.filter((item) => item !== permissionId));
        return;
      }

      await rbacService.addCustomPermission(userId, permissionId);
      setCustomPermissions((previous) => [...previous, permissionId]);
    } catch (error) {
      console.error('Failed to toggle permission:', error);
    }
  }

  function getRoleColor(roleId: string) {
    const colorMap: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      moderator: 'bg-orange-100 text-orange-700 border-orange-200',
      staff: 'bg-blue-100 text-blue-700 border-blue-200',
      support: 'bg-green-100 text-green-700 border-green-200',
      merchant: 'bg-purple-100 text-purple-700 border-purple-200',
      driver: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      customer: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return colorMap[roleId] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  }

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
    const category = permission.category;
    groups[category] ??= [];
    groups[category].push(permission);
    return groups;
  }, {});

  const currentRole = userPermissions ? rbacService.getRole(userPermissions.roleId) : null;

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <GlassPanel className="p-6">
        <h3 className="mb-4 flex items-center text-lg font-semibold">
          <ShieldCheckIcon className="mr-2 h-5 w-5" />
          Role Management
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => void handleRoleChange(role.id)}
              className={cn(
                'rounded-lg border-2 p-4 text-left transition-all',
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                getRoleColor(role.id),
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold">{role.name}</h4>
                {selectedRole === role.id ? <div className="h-3 w-3 rounded-full bg-blue-600" /> : null}
              </div>

              <p className="mb-3 text-sm opacity-75">{role.description}</p>

              <div className="flex items-center justify-between text-xs">
                <span>{role.permissions.length} permissions</span>
                <span className="rounded-full bg-gray-200 px-2 py-1">Level {role.hierarchy}</span>
              </div>
            </button>
          ))}
        </div>
      </GlassPanel>

      {userPermissions ? (
        <>
          <GlassPanel className="p-6">
            <h3 className="mb-4 flex items-center text-lg font-semibold">
              <UserGroupIcon className="mr-2 h-5 w-5" />
              Current Permissions
            </h3>

            <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Role</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {currentRole?.name ?? userPermissions.roleId}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium',
                    getRoleColor(userPermissions.roleId),
                  )}
                >
                  {userPermissions.roleId.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total Permissions:</span>
                <span className="font-medium">
                  {userPermissions.permissions.length + customPermissions.length}
                </span>
              </div>

              {userPermissions.restrictions ? (
                <div className="text-sm text-orange-600">Access restrictions applied</div>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center font-medium">
                <KeyIcon className="mr-2 h-4 w-4" />
                Custom Permissions
              </h4>
              <PremiumButton
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowPermissionDetails((previous) => !previous)}
              >
                {showPermissionDetails ? 'Hide' : 'Show'} Details
              </PremiumButton>
            </div>

            {showPermissionDetails ? (
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <h5 className="mb-3 font-medium capitalize text-gray-700 dark:text-gray-300">
                      {category}
                    </h5>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {categoryPermissions.map((permission) => {
                        const hasPermission =
                          userPermissions.permissions.includes(permission.id) ||
                          customPermissions.includes(permission.id);

                        return (
                          <button
                            key={permission.id}
                            type="button"
                            onClick={() => void handlePermissionToggle(permission.id)}
                            className={cn(
                              'rounded-lg border p-3 text-left transition-all',
                              hasPermission
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300',
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-xs font-semibold uppercase">
                                {ACTION_LABELS[permission.action] ?? 'perm'}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{permission.name}</p>
                                <p className="mt-1 text-xs opacity-75">{permission.description}</p>
                              </div>

                              <div className="flex items-center space-x-1">
                                {hasPermission ? (
                                  <EyeIcon className="h-4 w-4 text-green-600" />
                                ) : (
                                  <PlusIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </GlassPanel>
        </>
      ) : null}

      <GlassPanel className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Role Hierarchy</h3>

        <div className="space-y-2">
          {[...roles]
            .sort((a, b) => b.hierarchy - a.hierarchy)
            .map((role) => (
              <div
                key={role.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  getRoleColor(role.id),
                )}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                      getRoleColor(role.id),
                    )}
                  >
                    {role.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm opacity-75">{role.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium">Level {role.hierarchy}</div>
                  <div className="text-xs opacity-75">{role.permissions.length} permissions</div>
                </div>
              </div>
            ))}
        </div>
      </GlassPanel>
    </div>
  );
}
