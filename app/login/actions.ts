'use server';

import { cookies } from 'next/headers';
import { authenticateUser, createUserWithEmailAndPassword } from '@/lib/auth-server';
import {
  getOwnerAccessCode,
  getUserByEmail,
  getUserByRole,
  setSessionUser,
  toSessionUser,
} from '@/lib/auth';
import type { UserRole } from '@/types';

interface AuthFormData {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function signInAction(
  formData: AuthFormData,
  mode: 'signin' | 'signup',
): Promise<ActionResult> {
  try {
    if (mode === 'signup') {
      if (!formData.email || !formData.password || !formData.fullName) {
        return { success: false, error: 'All fields are required.' };
      }

      if (formData.password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long.',
        };
      }

      const newUser = await createUserWithEmailAndPassword(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
      );

      const sessionUser = toSessionUser({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as UserRole,
        full_name: newUser.fullName,
      });

      await setSessionUser(sessionUser);
      return { success: true };
    }

    if (!formData.email || !formData.password) {
      return {
        success: false,
        error: 'Email address and password are required.',
      };
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected sign-in error.',
    };
  }
}

export async function signInAsRole(role: UserRole): Promise<ActionResult> {
  try {
    const user = await getUserByRole(role);

    if (!user) {
      return {
        success: false,
        error: `No seeded demo account was found for ${role}.`,
      };
    }

    const sessionUser = toSessionUser(user);
    await setSessionUser(sessionUser);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to sign in.',
    };
  }
}

export async function signInAsOwner(
  accessCode: string,
): Promise<ActionResult> {
  try {
    const correctCode = getOwnerAccessCode();

    if (!correctCode) {
      return {
        success: false,
        error: 'Owner access is not configured for this environment.',
      };
    }

    if (accessCode !== correctCode) {
      return { success: false, error: 'The owner access code is incorrect.' };
    }

    const user = (await getUserByRole('admin')) ?? (await getUserByRole('owner'));

    if (!user) {
      return {
        success: false,
        error: 'No owner or admin account is available yet.',
      };
    }

    const sessionUser = toSessionUser(user, true);
    await setSessionUser(sessionUser);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to open owner access.',
    };
  }
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('sareepro_session');
  cookieStore.delete('sareepro-session');
}
