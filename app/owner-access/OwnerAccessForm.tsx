"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { signInAsOwner } from "@/app/login/actions";

interface OwnerAccessFormProps {
  labels: {
    ownerEmail: string;
    accessCode: string;
    openOwnerConsole: string;
  };
}

export function OwnerAccessForm({ labels }: OwnerAccessFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("admin@sareepro.local");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          const result = await signInAsOwner(email, accessCode);

          if (!result.success) {
            setError(result.error ?? "Unable to open owner console.");
            return;
          }

          router.push("/workspace");
          router.refresh();
        });
      }}
    >
      <label className="block space-y-2 text-sm font-medium text-[var(--color-ink)]">
        {labels.ownerEmail}
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
          required
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-[var(--color-ink)]">
        {labels.accessCode}
        <input
          type="password"
          name="accessCode"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
          required
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {labels.openOwnerConsole}
      </Button>
    </form>
  );
}
