import { requireSessionUser } from '@/lib/auth';
import Link from 'next/link';

export default async function SearchPage() {
  await requireSessionUser();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
          Search
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Find merchants, cuisines, and dishes
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-8 text-center">
        <div className="text-6xl">🔍</div>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Search Coming Soon
        </h2>
        <p className="mt-3 text-[var(--color-muted)]">
          Use the search bar in the merchant listing page
        </p>
        <Link href="/workspace/merchants" className="mt-6 inline-block">
          <span className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]">
            Browse Merchants
          </span>
        </Link>
      </div>
    </main>
  );
}
