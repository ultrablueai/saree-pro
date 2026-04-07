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
    <main className="app-shell mx-auto min-h-screen w-full max-w-5xl px-4 pb-20 pt-10 sm:px-8">
      <div className="glass-panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
          Workspace Error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          The workspace could not load this state
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          Retry the segment to refetch the workspace data. If the problem persists, the backend
          contract for this role likely needs attention.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
            Digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6">
          <Button onClick={() => unstable_retry()}>Retry workspace</Button>
        </div>
      </div>
    </main>
  );
}
