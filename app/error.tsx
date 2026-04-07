"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-16">
      <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
          Runtime Error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          This route hit an unexpected issue
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
          The page shell is still healthy. Retry the segment to fetch fresh data and render it
          again.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
            Digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6">
          <Button onClick={() => unstable_retry()}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
