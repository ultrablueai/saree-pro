'use server';

import { hash, compare } from 'bcryptjs';
import { getDbExecutor } from '@/lib/db';

export interface UserProfile {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(userId: string, profile: UserProfile) {
  try {
    const db = await getDbExecutor();
    
    await db.run(
      `UPDATE "AppUser" SET "fullName" = ?, phone = ?, "avatarUrl" = ?, "updatedAt" = datetime('now') WHERE id = ?`,
      [profile.fullName, profile.phone || null, profile.avatarUrl || null, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'فشل تحديث الملف الشخصي' };
  }
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const db = await getDbExecutor();
    
    // Get current password hash
    const user = await db.get<{ passwordHash: string }>(
      `SELECT "passwordHash" FROM "AppUser" WHERE id = ?`,
      [userId]
    );

    if (!user || !user.passwordHash) {
      return { error: 'المستخدم غير موجود' };
    }

    // Verify current password
    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return { error: 'كلمة المرور الحالية غير صحيحة' };
    }

    // Hash new password
    const newHash = await hash(newPassword, 12);

    // Update password
    await db.run(
      `UPDATE "AppUser" SET "passwordHash" = ?, "updatedAt" = datetime('now') WHERE id = ?`,
      [newHash, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'فشل تغيير كلمة المرور' };
  }
}
