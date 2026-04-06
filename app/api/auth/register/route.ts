import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from '@/lib/auth-server';
import { setSessionUser, toSessionUser } from '@/lib/auth';
import type { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const newUser = await createUserWithEmailAndPassword(
      email,
      password,
      fullName,
      role || 'customer'
    );

    const sessionUser = toSessionUser({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      full_name: newUser.fullName,
    });

    await setSessionUser(sessionUser);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'فشل إنشاء الحساب' },
      { status: 400 }
    );
  }
}
