import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { getDbExecutor } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

interface AuthUserRow {
  id: string;
  email: string;
  role: string;
  full_name: string;
  password_hash: string | null;
  is_active: number | boolean;
  email_verified: number | boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function createUserWithEmailAndPassword(
  email: string,
  password: string,
  fullName: string,
  role = "customer",
) {
  const db = await getDbExecutor();
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  try {
    await db.run(
      `INSERT INTO app_users (
        id,
        email,
        role,
        full_name,
        password_hash,
        is_active,
        email_verified,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`,
      [userId, email, role, fullName, passwordHash],
    );

    return {
      id: userId,
      email,
      role,
      fullName,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new Error("Email already exists.");
    }

    throw error;
  }
}

export async function authenticateUser(email: string, password: string) {
  const db = await getDbExecutor();
  const user = await db.get<AuthUserRow>(
    `SELECT
      id,
      email,
      role,
      full_name,
      password_hash,
      is_active,
      email_verified
    FROM app_users
    WHERE lower(email) = lower(?)`,
    [email],
  );

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (!user.is_active) {
    throw new Error("This account is disabled.");
  }

  if (!user.password_hash) {
    throw new Error("This account does not have a password set.");
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
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
    `UPDATE app_users
     SET password_hash = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [passwordHash, userId],
  );
}

export async function markEmailAsVerified(userId: string) {
  const db = await getDbExecutor();

  await db.run(
    `UPDATE app_users
     SET email_verified = 1, email_verified_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [userId],
  );
}

export async function checkIfUserExists(email: string): Promise<boolean> {
  const db = await getDbExecutor();
  const result = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM app_users
     WHERE lower(email) = lower(?)`,
    [email],
  );

  return (result?.count ?? 0) > 0;
}
