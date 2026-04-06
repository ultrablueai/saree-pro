import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-server';
import { setSessionUser, toSessionUser } from '@/lib/auth';
import type { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);

    const sessionUser = toSessionUser({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      full_name: user.fullName,
    });

    await setSessionUser(sessionUser);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'فشل تسجيل الدخول' },
      { status: 401 }
    );
  }
}
