'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  getAvailablePermissions,
  getPermissionCategoryName,
  getRole,
  type Permission,
  type UserPermission,
} from '../../lib/rbac';
import { cn } from '../../lib/utils';
import { GlassPanel } from '../PremiumUI/GlassPanel';

interface RoleManagerProps {
  userId: string;
  userLabel?: string;
  className?: string;
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

export function RoleManager({ userId, userLabel, className = '' }: RoleManagerProps) {
  const [snapshot, setSnapshot] = useState<UserPermission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPermissions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/rbac/permissions/${encodeURIComponent(userId)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unable to load access profile');
        }

        const payload = (await response.json()) as {
          data?: UserPermission;
          permissions?: UserPermission;
        };

        if (!isCancelled) {
          setSnapshot(payload.data ?? payload.permissions ?? null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load access profile');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const permissionsByCategory = useMemo(() => {
    const grantedPermissions = new Set([
      ...(snapshot?.permissions ?? []),
      ...(snapshot?.customPermissions ?? []),
    ]);

    return getAvailablePermissions().reduce<Record<string, Permission[]>>((groups, permission) => {
      if (!grantedPermissions.has(permission.id)) {
        return groups;
      }

      groups[permission.category] ??= [];
      groups[permission.category].push(permission);
      return groups;
    }, {});
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <GlassPanel className={cn('p-6', className)}>
        <p className="text-sm text-rose-700 dark:text-rose-200">
          {error ?? 'No access profile available for this user.'}
        </p>
      </GlassPanel>
    );
  }

  const role = getRole(snapshot.roleId);

  return (
    <div className={cn('space-y-6', className)}>
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center text-lg font-semibold text-[var(--color-ink)]">
              <ShieldCheckIcon className="mr-2 h-5 w-5" />
              Access profile
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {userLabel ?? snapshot.userId}
            </p>
          </div>

          <div
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium',
              getRoleColor(snapshot.roleId),
            )}
          >
            {snapshot.roleId.toUpperCase()}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Role</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {role?.name ?? snapshot.roleId}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Hierarchy
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              Level {role?.hierarchy ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Permissions
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {(snapshot.permissions.length + (snapshot.customPermissions?.length ?? 0)).toString()}
            </p>
          </div>
        </div>

        {role ? (
          <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">{role.description}</p>
        ) : null}
      </GlassPanel>

      <GlassPanel className="p-6">
        <h4 className="flex items-center text-lg font-semibold text-[var(--color-ink)]">
          <UserGroupIcon className="mr-2 h-5 w-5" />
          Restrictions
        </h4>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Order scope
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
              {snapshot.restrictions?.canAccessAllOrders ? 'Platform-wide' : 'Role scoped'}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Merchant scope
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
              {snapshot.restrictions?.canAccessAllMerchants ? 'Platform-wide' : 'Role scoped'}
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h4 className="flex items-center text-lg font-semibold text-[var(--color-ink)]">
          <KeyIcon className="mr-2 h-5 w-5" />
          Granted permissions
        </h4>

        <div className="mt-5 space-y-6">
          {Object.entries(permissionsByCategory).length ? (
            Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category}>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {getPermissionCategoryName(category as Permission['category'])}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {categoryPermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4"
                    >
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {permission.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {permission.description}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {permission.id}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted)]">No granted permissions found.</p>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

export default RoleManager;
