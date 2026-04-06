"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { signInAsOwner, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {
  status: "idle",
  message: "",
};

interface OwnerAccessFormProps {
  labels: {
    ownerEmail: string;
    accessCode: string;
    openOwnerConsole: string;
  };
}

export function OwnerAccessForm({ labels }: OwnerAccessFormProps) {
  const [state, action] = useActionState(signInAsOwner, initialState);

  return (
    <form action={action} className="space-y-5">
      <label className="block space-y-2 text-sm font-medium text-[var(--color-ink)]">
        {labels.ownerEmail}
        <input
          type="email"
          name="email"
          defaultValue="admin@sareepro.local"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
          required
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-[var(--color-ink)]">
        {labels.accessCode}
        <input
          type="password"
          name="accessCode"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
          required
        />
      </label>

      {state.status === "error" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full">
        {labels.openOwnerConsole}
      </Button>
    </form>
  );
}
