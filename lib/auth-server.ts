import { hash, compare } from "bcryptjs";
import { getDbExecutor } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function createUserWithEmailAndPassword(
  email: string,
  password: string,
  fullName: string,
  role: string = "customer"
) {
  const db = await getDbExecutor();
  const passwordHash = await hashPassword(password);

  try {
    const result = await db.run(
      `INSERT INTO app_users (email, role, full_name, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [email, role, fullName, passwordHash]
    );

    return {
      id: (result as any).id,
      email,
      role,
      fullName,
    };
  } catch (error: any) {
    if (error.message.includes("UNIQUE")) {
      throw new Error("البريد الإلكتروني مسجل مسبقاً");
    }
    throw error;
  }
}

export async function authenticateUser(email: string, password: string) {
  const db = await getDbExecutor();
  const user = await db.get<{
    id: string;
    email: string;
    role: string;
    full_name: string;
    password_hash: string;
    is_active: number;
    email_verified: number;
  }>(
    `SELECT id, email, role, full_name, password_hash, is_active, email_verified
     FROM app_users
     WHERE lower(email) = lower(?)`,
    [email]
  );

  if (!user) {
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  if (!user.is_active) {
    throw new Error("الحساب معطل. تواصل مع الدعم");
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    emailVerified: Boolean(user.email_verified),
  };
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const db = await getDbExecutor();
  const passwordHash = await hashPassword(newPassword);

  await db.run(
    `UPDATE app_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    [passwordHash, userId]
  );
}

export async function markEmailAsVerified(userId: string) {
  const db = await getDbExecutor();
  await db.run(
    `UPDATE app_users SET email_verified = 1, email_verified_at = datetime('now') WHERE id = ?`,
    [userId]
  );
}

export async function checkIfUserExists(email: string): Promise<boolean> {
  const db = await getDbExecutor();
  const result = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM app_users WHERE lower(email) = lower(?)`,
    [email]
  );
  return (result?.count ?? 0) > 0;
}
