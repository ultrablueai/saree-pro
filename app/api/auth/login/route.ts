import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-server';
import { setSessionUser, toSessionUser } from '@/lib/auth';
import type { UserRole } from '@/types';

interface LoginRequestBody {
  email?: string;
  password?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙˆÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ù…Ø·Ù„ÙˆØ¨Ø§Ù†' },
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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'ÙØ´Ù„ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„') },
      { status: 401 }
    );
  }
}
