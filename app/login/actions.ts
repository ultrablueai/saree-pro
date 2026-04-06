'use server';

import { cookies } from 'next/headers';
import { authenticateUser, createUserWithEmailAndPassword } from '@/lib/auth-server';
import { getUserByRole, getUserByEmail, setSessionUser, toSessionUser } from '@/lib/auth';
import type { UserRole } from '@/types';

interface FormData {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function signInAction(formData: FormData, mode: 'signin' | 'signup'): Promise<ActionResult> {
  try {
    if (mode === 'signup') {
      // التحقق من البيانات
      if (!formData.email || !formData.password || !formData.fullName) {
        return { success: false, error: 'جميع الحقول مطلوبة' };
      }

      if (formData.password.length < 6) {
        return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
      }

      // إنشاء مستخدم جديد
      const newUser = await createUserWithEmailAndPassword(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );

      // تسجيل الدخول مباشرة
      const sessionUser = toSessionUser({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as UserRole,
        full_name: newUser.fullName,
      });

      await setSessionUser(sessionUser);
      return { success: true };
    } else {
      // تسجيل الدخول
      if (!formData.email || !formData.password) {
        return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' };
      }

      const user = await authenticateUser(formData.email, formData.password);

      const sessionUser = toSessionUser({
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        full_name: user.fullName,
      });

      await setSessionUser(sessionUser);
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
}

export async function signInAsRole(role: UserRole): Promise<ActionResult> {
  try {
    const user = await getUserByRole(role);
    
    if (!user) {
      return { success: false, error: `لم يتم العثور على حساب تجريبي لـ ${role}` };
    }

    const sessionUser = toSessionUser(user);
    await setSessionUser(sessionUser);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل تسجيل الدخول' };
  }
}

export async function signInAsOwner(email: string, accessCode: string): Promise<ActionResult> {
  try {
    const correctCode = process.env.OWNER_ACCESS_CODE ?? '7721';
    
    if (accessCode !== correctCode) {
      return { success: false, error: 'رمز الدخول غير صحيح' };
    }

    const user = await getUserByEmail(email);
    
    if (!user) {
      return { success: false, error: 'البريد الإلكتروني غير مسجل' };
    }

    if (user.role !== 'admin' && user.role !== 'owner') {
      return { success: false, error: 'ليس لديك صلاحية المالك' };
    }

    const sessionUser = toSessionUser(user, true);
    await setSessionUser(sessionUser);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل تسجيل الدخول' };
  }
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('sareepro-session');
}
