"use client";

import { useMemo, useState } from "react";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { GlassPanel } from "../PremiumUI/GlassPanel";
import { PremiumButton } from "../PremiumUI/PremiumButton";
import { cn } from "../../lib/utils";

export interface NotificationCenterItem {
  id: string;
  title: string;
  message: string;
  type: "order" | "payment" | "delivery" | "review" | "system" | "info" | string;
  isRead: boolean;
  createdAt: string | Date;
  link?: string | null;
}

interface NotificationCenterProps {
  notifications: NotificationCenterItem[];
  className?: string;
  onNotificationClick?: (notification: NotificationCenterItem) => void;
  onMarkAsRead?: (notificationId: string) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
}

function formatRelativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getNotificationAccent(type: NotificationCenterItem["type"]) {
  const palette: Record<string, string> = {
    order: "border-l-[#d66b42]",
    payment: "border-l-emerald-500",
    delivery: "border-l-sky-500",
    review: "border-l-amber-500",
    system: "border-l-slate-500",
    info: "border-l-violet-500",
  };

  return palette[type] ?? "border-l-[var(--color-accent)]";
}

export function NotificationCenter({
  notifications,
  className = "",
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const filteredNotifications = useMemo(() => {
    return filter === "unread"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;
  }, [filter, notifications]);

  return (
    <div className={cn("max-w-3xl space-y-4", className)}>
      <GlassPanel className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BellIcon className="h-5 w-5 text-[var(--color-accent-strong)]" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">Notifications</h2>
              <p className="text-sm text-[var(--color-muted)]">
                {unreadCount} unread, {notifications.length} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                filter === "all"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-white/70 text-[var(--color-ink)]",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                filter === "unread"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-white/70 text-[var(--color-ink)]",
              )}
            >
              Unread
            </button>
            {unreadCount > 0 ? (
              <PremiumButton size="sm" variant="secondary" onClick={() => void onMarkAllAsRead?.()}>
                Mark all read
              </PremiumButton>
            ) : null}
          </div>
        </div>
      </GlassPanel>

      {filteredNotifications.length ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <GlassPanel
              key={notification.id}
              className={cn(
                "border-l-4 p-4",
                getNotificationAccent(notification.type),
                notification.isRead ? "opacity-80" : "bg-white/20",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => onNotificationClick?.(notification)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--color-ink)]">{notification.title}</p>
                    {!notification.isRead ? (
                      <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {notification.message}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {notification.type} • {formatRelativeTime(notification.createdAt)}
                  </p>
                </button>

                {!notification.isRead ? (
                  <button
                    type="button"
                    onClick={() => void onMarkAsRead?.(notification.id)}
                    className="rounded-full border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition hover:text-[var(--color-accent-strong)]"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel className="p-8 text-center">
          <BellIcon className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-4 text-lg font-medium text-[var(--color-ink)]">No notifications</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            New order, delivery, and system updates will appear here.
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
