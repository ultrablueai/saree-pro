"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseItems = [
  { label: "Home", href: "/", match: (pathname: string) => pathname === "/" },
  {
    label: "Workspace",
    href: "/workspace",
    match: (pathname: string) => pathname === "/workspace",
  },
  {
    label: "Orders",
    href: "/workspace/orders",
    match: (pathname: string) => pathname.startsWith("/workspace/orders"),
  },
] as const;

export function MobileBottomNav({ showOwner = false }: { showOwner?: boolean }) {
  const pathname = usePathname();
  const items = showOwner
    ? [
        ...baseItems,
        {
          label: "Control",
          href: "/owner-access",
          match: (value: string) => value === "/owner-access",
        },
      ]
    : baseItems;

  return (
    <nav className="safe-area-bottom fixed inset-x-3 bottom-3 z-50 md:hidden">
      <div className="grid grid-cols-4 gap-2 rounded-[1.75rem] border border-white/60 bg-[rgba(255,250,245,0.9)] p-2 shadow-[0_22px_60px_-28px_rgba(19,23,29,0.55)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[1.1rem] px-2 text-center text-[11px] font-semibold tracking-[0.18em] transition ${
                active
                  ? "bg-[var(--color-accent)] text-white shadow-[0_18px_40px_-22px_rgba(214,107,66,0.8)]"
                  : "text-[var(--color-muted)]"
              }`}
            >
              <span
                className={`mb-2 h-1.5 w-6 rounded-full transition ${
                  active ? "bg-white/90" : "bg-[rgba(28,25,23,0.16)]"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
