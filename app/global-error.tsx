"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-ink)]">
        <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-16">
          <div className="glass-panel w-full rounded-[2rem] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
              Global Error
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Saree Pro could not finish rendering this view
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              This boundary sits above the app shell, so retrying will ask Next.js to render the
              route tree again from the top.
            </p>
            {error.digest ? (
              <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
                Digest: {error.digest}
              </p>
            ) : null}
            <div className="mt-6">
              <Button onClick={() => unstable_retry()}>Retry app</Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
