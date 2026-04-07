"use client";

import Link from "next/link";
import { useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";

export interface NotificationBellItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  notifications: NotificationBellItem[];
  unreadCount: number;
  manageHref?: string;
}

function formatTimeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  manageHref = "/workspace/profile",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/90 text-[var(--color-ink)] shadow-[0_12px_30px_-20px_rgba(28,25,23,0.35)] transition hover:bg-white"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-[1.4rem] border border-[var(--color-border)] bg-white/95 shadow-[0_24px_50px_-22px_rgba(28,25,23,0.35)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Notifications</p>
              <p className="text-xs text-[var(--color-muted)]">{unreadCount} unread</p>
            </div>
            <Link
              href={manageHref}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]"
              onClick={() => setIsOpen(false)}
            >
              Manage
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? (
              notifications.map((notification) => {
                const content = (
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.isRead ? "bg-stone-300" : "bg-[var(--color-accent)]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {notification.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                if (notification.link) {
                  return (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => setIsOpen(false)}
                      className="block border-b border-[var(--color-border)] px-4 py-3 transition hover:bg-[var(--color-surface)]"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={notification.id}
                    className="border-b border-[var(--color-border)] px-4 py-3"
                  >
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
