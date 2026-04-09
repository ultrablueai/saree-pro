import { requireSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/Button';
import { signOutAction } from '@/app/login/actions';

export default async function ProfilePage() {
  const session = await requireSessionUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Profile</h1>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)]">
              Name
            </label>
            <p className="mt-1 text-[var(--color-ink)]">{session.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)]">
              Email
            </label>
            <p className="mt-1 text-[var(--color-ink)]">{session.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)]">
              Role
            </label>
            <p className="mt-1">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                {session.role}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)]">
              User ID
            </label>
            <p className="mt-1 font-mono text-sm text-[var(--color-ink)]">{session.id}</p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
