'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, ScaleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { disputeService, type Dispute, type DisputeFilter, type DisputeTemplate } from '../../lib/dispute';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { cn } from '../../lib/utils';

interface DisputeCenterProps {
  userId: string;
  role: 'customer' | 'merchant' | 'driver' | 'admin' | 'owner';
  className?: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  if (status === 'open') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (status === 'resolved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  return 'border-stone-200 bg-stone-100 text-stone-700';
}

export function DisputeCenter({ userId, role, className = '' }: DisputeCenterProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [templates, setTemplates] = useState<DisputeTemplate[]>([]);
  const [filters, setFilters] = useState<DisputeFilter>({
    status: 'all',
    openedByRole: 'all',
  });
  const [totals, setTotals] = useState({
    all: 0,
    open: 0,
    resolved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const [data, templateList] = await Promise.all([
          disputeService.getDisputes(userId, filters),
          Promise.resolve(disputeService.getDisputeTemplates()),
        ]);

        if (!isMounted) {
          return;
        }

        setDisputes(data.disputes);
        setTotals(data.totals);
        setTemplates(templateList);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load disputes');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [filters, userId]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
            <ScaleIcon className="mr-3 h-6 w-6" />
            Dispute Center
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Live dispute visibility for the current workspace role. This slice is read-only and
            reflects the same order dispute data used by the server pages.
          </p>
        </div>

        <div className="grid min-w-72 gap-3 sm:grid-cols-3">
          <GlassPanel className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Total</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totals.all}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Open</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totals.open}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Resolved</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totals.resolved}</p>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel className="p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <label className="space-y-2 text-sm font-medium text-gray-900 dark:text-white">
            Status
            <select
              value={filters.status ?? 'all'}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-gray-900 dark:text-white">
            Opened by
            <select
              value={filters.openedByRole ?? 'all'}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  openedByRole: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All roles</option>
              <option value="customer">Customer</option>
              <option value="merchant">Merchant</option>
              <option value="driver">Driver</option>
            </select>
          </label>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Ready-to-handle dispute playbooks
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Templates are guidance cards for the current read-only dispute workflow.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-[1.1rem] border border-[var(--color-border)] bg-white/70 p-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {template.type}
              </p>
              <p className="mt-2 font-semibold text-[var(--color-ink)]">{template.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : null}

      {error ? (
        <GlassPanel className="p-5 text-sm text-red-700 dark:text-red-300">
          {error}
        </GlassPanel>
      ) : null}

      {!isLoading && !error ? (
        disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <GlassPanel key={dispute.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {dispute.orderCode}
                      </p>
                      <span
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                          getStatusTone(dispute.status),
                        )}
                      >
                        {dispute.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {dispute.customerName} - {dispute.merchantName}
                      {dispute.driverName ? ` - ${dispute.driverName}` : ''}
                    </p>
                  </div>

                  <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    opened by {dispute.openedByRole}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[0.68fr_0.32fr]">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{dispute.reason}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {dispute.details ?? 'No extra details were provided for this dispute.'}
                    </p>

                    {dispute.resolution ? (
                      <div className="mt-4 rounded-[1rem] border border-[var(--color-border)] bg-white/70 p-4">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          Resolution: {dispute.resolution}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {dispute.resolutionNote ?? 'No resolution note was recorded.'}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-[var(--color-border)] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Order value
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                      {formatCurrency(dispute.totalAmount, dispute.currency)}
                    </p>
                    <p className="mt-3 text-sm text-[var(--color-muted)]">
                      Opened {formatDate(dispute.createdAt)}
                    </p>
                    {dispute.resolvedAt ? (
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        Resolved {formatDate(dispute.resolvedAt)}
                      </p>
                    ) : null}
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Current role: {role}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/workspace/orders/${dispute.orderId}`}
                    className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    Open order details
                  </Link>
                  <Link
                    href="/workspace/orders"
                    className="text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
                  >
                    Orders hub
                  </Link>
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel className="p-8 text-center">
            <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
            <p className="mt-4 text-lg font-semibold text-[var(--color-ink)]">No disputes found</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              The current filters did not match any visible disputes for this workspace session.
            </p>
          </GlassPanel>
        )
      ) : null}
    </div>
  );
}
