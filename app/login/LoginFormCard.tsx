"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { signInAction } from "@/app/login/actions";

interface LoginFormCardProps {
  labels: {
    signInTab: string;
    signUpTab: string;
    formTitle: string;
    formBody: string;
    fullName: string;
    email: string;
    password: string;
    role: string;
    submitSignIn: string;
    submitSignUp: string;
    busy: string;
    toggleToSignUpLead: string;
    toggleToSignUpAction: string;
    toggleToSignInLead: string;
    toggleToSignInAction: string;
    customer: string;
    merchant: string;
    driver: string;
  };
}

type AuthMode = "signin" | "signup";

export function LoginFormCard({ labels }: LoginFormCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/workspace";
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "customer",
  });

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await signInAction(formData, mode);

        if (!result.success) {
          setError(result.error ?? "Unable to continue.");
          return;
        }

        router.push(redirectTarget);
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to continue.",
        );
      }
    });
  }

  const toggleText =
    mode === "signin"
      ? {
          lead: labels.toggleToSignUpLead,
          action: labels.toggleToSignUpAction,
        }
      : {
          lead: labels.toggleToSignInLead,
          action: labels.toggleToSignInAction,
        };

  return (
    <div className="rounded-[2rem] border border-[var(--color-border)] bg-white/88 p-6 shadow-[0_28px_80px_-48px_rgba(28,25,23,0.45)] backdrop-blur sm:p-7">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-[var(--color-ink)] text-white shadow-[0_18px_30px_-22px_rgba(28,25,23,0.6)]"
              : "bg-[var(--color-surface-strong)] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
          }`}
        >
          {labels.signInTab}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-[var(--color-ink)] text-white shadow-[0_18px_30px_-22px_rgba(28,25,23,0.6)]"
              : "bg-[var(--color-surface-strong)] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
          }`}
        >
          {labels.signUpTab}
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {labels.formTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          {labels.formBody}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {mode === "signup" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              {labels.fullName}
            </span>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
              placeholder={labels.fullName}
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
            {labels.email}
          </span>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
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
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            dir="ltr"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            placeholder="••••••••"
          />
        </label>

        {mode === "signup" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              {labels.role}
            </span>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            >
              <option value="customer">{labels.customer}</option>
              <option value="merchant">{labels.merchant}</option>
              <option value="driver">{labels.driver}</option>
            </select>
          </label>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? labels.busy
            : mode === "signin"
              ? labels.submitSignIn
              : labels.submitSignUp}
        </Button>
      </form>

      <div className="mt-6 text-sm text-[var(--color-muted)]">
        <span>{toggleText.lead}</span>{" "}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setError(null);
          }}
          className="font-semibold text-[var(--color-accent-strong)] transition hover:opacity-80"
        >
          {toggleText.action}
        </button>
      </div>
    </div>
  );
}
