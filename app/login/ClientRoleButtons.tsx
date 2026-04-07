"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { signInAsRole } from "@/app/login/actions";
import type { UserRole } from "@/types";

interface ClientRoleButtonsProps {
  labels: {
    customerTitle: string;
    customerDescription: string;
    merchantTitle: string;
    merchantDescription: string;
    driverTitle: string;
    driverDescription: string;
    enterWorkspace: string;
  };
}

function buildRoleCards(labels: ClientRoleButtonsProps["labels"]): Array<{
  role: Exclude<UserRole, "admin">;
  title: string;
  description: string;
}> {
  return [
    {
      role: "customer",
      title: labels.customerTitle,
      description: labels.customerDescription,
    },
    {
      role: "merchant",
      title: labels.merchantTitle,
      description: labels.merchantDescription,
    },
    {
      role: "driver",
      title: labels.driverTitle,
      description: labels.driverDescription,
    },
  ];
}

export function ClientRoleButtons({ labels }: ClientRoleButtonsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const roleCards = buildRoleCards(labels);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {roleCards.map((card) => (
          <div
            key={card.role}
            className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/80 p-5 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-strong)]">
              {card.role}
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {card.description}
            </p>
            <Button
              type="button"
              disabled={isPending}
              className="mt-6 w-full"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await signInAsRole(card.role);

                  if (!result.success) {
                    setError(result.error ?? "Unable to sign in.");
                    return;
                  }

                  router.push("/workspace");
                  router.refresh();
                });
              }}
            >
              {labels.enterWorkspace}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
