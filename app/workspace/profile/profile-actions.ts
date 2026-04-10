'use server';

import { compare, hash } from 'bcryptjs';
import { getDbExecutor } from '@/lib/db';

export interface UserProfile {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function updateUserProfile(userId: string, profile: UserProfile) {
  try {
    const db = await getDbExecutor();

    await db.run(
      `UPDATE "AppUser" SET "fullName" = ?, phone = ?, "avatarUrl" = ?, "updatedAt" = datetime('now') WHERE id = ?`,
      [profile.fullName, profile.phone || null, profile.avatarUrl || null, userId]
    );

    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, 'ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ') };
  }
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const db = await getDbExecutor();

    const user = await db.get<{ passwordHash: string }>(
      `SELECT "passwordHash" FROM "AppUser" WHERE id = ?`,
      [userId]
    );

    if (!user || !user.passwordHash) {
      return { error: 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' };
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return { error: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©' };
    }

    const newHash = await hash(newPassword, 12);

    await db.run(
      `UPDATE "AppUser" SET "passwordHash" = ?, "updatedAt" = datetime('now') WHERE id = ?`,
      [newHash, userId]
    );

    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, 'ÙØ´Ù„ ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±') };
  }
}
