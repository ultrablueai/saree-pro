'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { signInAction } from '@/app/login/actions';
import { Button } from '@/components/Button';

interface SupabaseLoginFormProps {
  labels: {
    email: string;
    password: string;
    submitSignIn: string;
    busy: string;
    forgotPassword: string;
    orContinueWithLocal: string;
  };
}

export function SupabaseLoginForm({ labels }: SupabaseLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/workspace';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalAuth, setUseLocalAuth] = useState(false);
  const supabase = createClient();

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        // Create local session to integrate with existing system
        const userMetadata = data.session.user.user_metadata;
        const result = await signInAction(
          {
            email: data.session.user.email!,
            password: '',
            fullName: userMetadata?.full_name || data.session.user.email!,
            role: userMetadata?.role || 'customer',
          },
          'signin'
        );

        if (!result.success) {
          setError(result.error ?? 'Unable to sign in.');
          return;
        }

        router.push(redirectTarget);
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to sign in with Supabase.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (useLocalAuth) {
    return null; // Let the main form handle local auth
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs font-medium text-[var(--color-muted)]">
          Sign in with Supabase
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form onSubmit={handleSupabaseSignIn} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
            {labels.email}
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
            {labels.password}
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

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? labels.busy : labels.submitSignIn}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setUseLocalAuth(true)}
            className="text-sm text-[var(--color-accent-strong)] hover:underline"
          >
            {labels.orContinueWithLocal}
          </button>
        </div>
      </form>
    </div>
  );
}
