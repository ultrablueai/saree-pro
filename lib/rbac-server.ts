import { getDbExecutor } from "@/lib/db";
import { createUserPermissionSnapshot, type UserPermission, type UserRole } from "@/lib/rbac";

interface AccessUserRow {
  id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

function normalizeUserRole(role: string): UserRole {
  if (role === "admin" || role === "merchant" || role === "driver" || role === "customer") {
    return role;
  }

  return "support";
}

export async function listAccessUsers() {
  const db = await getDbExecutor();
  const rows = await db.all<AccessUserRow>(
    `SELECT id, email, role, full_name, created_at
     FROM app_users
     ORDER BY created_at ASC, email ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: normalizeUserRole(row.role),
    fullName: row.full_name,
    createdAt: row.created_at,
  }));
}

export async function getUserPermissionSnapshot(userId: string): Promise<UserPermission | null> {
  const db = await getDbExecutor();
  const row = await db.get<AccessUserRow>(
    `SELECT id, email, role, full_name, created_at
     FROM app_users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (!row) {
    return null;
  }

  const normalizedRole = normalizeUserRole(row.role);
  const restrictions =
    normalizedRole === "admin"
      ? {
          canAccessAllMerchants: true,
          canAccessAllOrders: true,
        }
      : undefined;

  return createUserPermissionSnapshot(row.id, normalizedRole, [], restrictions);
}
