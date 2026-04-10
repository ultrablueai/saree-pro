import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from '@/lib/auth-server';
import { setSessionUser, toSessionUser } from '@/lib/auth';
import type { UserRole } from '@/types';

const userRoles = ['customer', 'merchant', 'driver', 'admin', 'owner'] as const;

interface RegisterRequestBody {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
}

function isUserRole(role: string): role is UserRole {
  return userRoles.includes(role as (typeof userRoles)[number]);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequestBody;
    const { email, password, fullName, role } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ù…Ø·Ù„ÙˆØ¨Ø©' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' },
        { status: 400 }
      );
    }

    const selectedRole: UserRole = role && isUserRole(role) ? role : 'customer';

    const newUser = await createUserWithEmailAndPassword(
      email,
      password,
      fullName,
      selectedRole
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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨') },
      { status: 400 }
    );
  }
}
