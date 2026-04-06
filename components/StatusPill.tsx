interface StatusPillProps {
  label: string;
  tone?: "success" | "warning" | "neutral";
}

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-900",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-900",
  neutral:
    "border-[var(--color-border)] bg-white/80 text-[var(--color-ink)]",
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
