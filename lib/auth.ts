import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDbExecutor } from "@/lib/db";
import type { UserRole } from "@/types";

const SESSION_COOKIE = "sareepro_session";
const LEGACY_SESSION_COOKIE = "sareepro-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  ownerAccess: boolean;
}

interface DbUserRow {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

function parseSessionCookie(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as SessionUser;
    
    // Validate session structure
    if (!parsed.id || !parsed.email || !parsed.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    return parseSessionCookie(
      cookieStore.get(SESSION_COOKIE)?.value ??
        cookieStore.get(LEGACY_SESSION_COOKIE)?.value,
    );
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const session = await requireSessionUser();

  if (!allowedRoles.includes(session.role)) {
    redirect("/workspace");
  }

  return session;
}

export async function setSessionUser(session: SessionUser) {
  const cookieStore = await cookies();
  
  const sessionData = {
    id: session.id,
    email: session.email,
    role: session.role,
    name: session.name,
    ownerAccess: session.ownerAccess || false,
  };

  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}

export async function refreshSession(session: SessionUser) {
  await setSessionUser(session);
}

export async function getUserByRole(role: UserRole) {
  const db = await getDbExecutor();
  return db.get<DbUserRow>(
    `SELECT id, email, role, full_name
     FROM app_users
     WHERE role = ?
     ORDER BY created_at ASC
     LIMIT 1`,
    [role],
  );
}

export async function getUserByEmail(email: string) {
  const db = await getDbExecutor();
  return db.get<DbUserRow>(
    `SELECT id, email, role, full_name
     FROM app_users
     WHERE lower(email) = lower(?)
     LIMIT 1`,
    [email],
  );
}

export function toSessionUser(user: DbUserRow, ownerAccess = false): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    ownerAccess,
  };
}

export function getOwnerAccessCode() {
  if (process.env.OWNER_ACCESS_CODE) {
    return process.env.OWNER_ACCESS_CODE;
  }

  if (process.env.NODE_ENV !== "production") {
    return "7721";
  }

  return "";
}
