import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { getDbExecutor } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

interface AuthUserRow {
  id: string;
  email: string;
  role: string;
  fullName: string;
  passwordHash: string | null;
  isActive: number | boolean;
  emailVerified: number | boolean;
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
      `INSERT INTO AppUser (
        id,
        email,
        role,
        fullName,
        passwordHash,
        isActive,
        emailVerified,
        createdAt,
        updatedAt
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
      fullName,
      passwordHash,
      isActive,
      emailVerified
    FROM AppUser
    WHERE lower(email) = lower(?)`,
    [email],
  );

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (!user.isActive) {
    throw new Error("This account is disabled.");
  }

  if (!user.passwordHash) {
    throw new Error("This account does not have a password set.");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    emailVerified: Boolean(user.emailVerified),
  };
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const db = await getDbExecutor();
  const passwordHash = await hashPassword(newPassword);

  await db.run(
    `UPDATE AppUser
     SET passwordHash = ?, updatedAt = datetime('now')
     WHERE id = ?`,
    [passwordHash, userId],
  );
}

export async function markEmailAsVerified(userId: string) {
  const db = await getDbExecutor();

  await db.run(
    `UPDATE AppUser
     SET emailVerified = 1, emailVerifiedAt = datetime('now'), updatedAt = datetime('now')
     WHERE id = ?`,
    [userId],
  );
}

export async function checkIfUserExists(email: string): Promise<boolean> {
  const db = await getDbExecutor();
  const result = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM AppUser
     WHERE lower(email) = lower(?)`,
    [email],
  );

  return (result?.count ?? 0) > 0;
}
