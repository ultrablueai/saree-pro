'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { signInAction } from '@/app/login/actions';
import { Button } from '@/components/Button';

type SignUpRole = 'customer' | 'merchant' | 'driver';

function isSignUpRole(value: string): value is SignUpRole {
  return value === 'customer' || value === 'merchant' || value === 'driver';
}

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignUpRole>('customer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create local session to integrate with existing system
        const result = await signInAction(
          {
            email,
            password,
            fullName,
            role,
          },
          'signup'
        );

        if (!result.success) {
          setError(result.error ?? 'Unable to create account.');
          return;
        }

        router.push('/workspace');
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create account.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
          Full Name
        </span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
          placeholder="Your full name"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
          Email Address
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
          placeholder="name@example.com"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          dir="ltr"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
          placeholder="••••••••"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
          Account Type
        </span>
        <select
          value={role}
          onChange={(e) => {
            if (isSignUpRole(e.target.value)) {
              setRole(e.target.value);
            }
          }}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
        >
          <option value="customer">Customer</option>
          <option value="merchant">Merchant</option>
          <option value="driver">Driver</option>
        </select>
      </label>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
