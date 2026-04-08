'use client';

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useFormattedCurrency, useLocalization } from '../../hooks/useLocalization';
import { getSurgeColor, type SurgePricingResult } from '../../lib/surge-pricing';
import { GlassPanel } from '../PremiumUI/GlassPanel';

interface SurgePricingIndicatorProps {
  locationId: string;
  merchantId?: string;
  baseFee?: number;
  className?: string;
  showDetails?: boolean;
}

interface SurgePayload {
  pricing?: SurgePricingResult;
  data?: SurgePricingResult;
  factors?: {
    orderCount: number;
    availableDrivers: number;
    normalizedLocationId: string;
  };
  refreshedAt?: string;
}

export function SurgePricingIndicator({
  locationId,
  merchantId,
  baseFee,
  className = '',
  showDetails = true,
}: SurgePricingIndicatorProps) {
  const [pricingResult, setPricingResult] = useState<SurgePricingResult | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [loadMeta, setLoadMeta] = useState<{ orderCount: number; availableDrivers: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();
  const formatCurrency = useFormattedCurrency();

  useEffect(() => {
    let isCancelled = false;

    async function loadPricing() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (merchantId) params.set('merchantId', merchantId);
        if (baseFee !== undefined) params.set('baseFee', String(baseFee));
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`/api/surge-pricing/${encodeURIComponent(locationId)}${suffix}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unable to load surge pricing');
        }

        const payload = (await response.json()) as SurgePayload;
        const pricing = payload.pricing ?? payload.data ?? null;

        if (!isCancelled) {
          setPricingResult(pricing);
          setRefreshedAt(payload.refreshedAt ?? null);
          setLoadMeta(
            payload.factors
              ? {
                  orderCount: payload.factors.orderCount,
                  availableDrivers: payload.factors.availableDrivers,
                }
              : null,
          );
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load surge pricing');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPricing();
    const interval = window.setInterval(() => {
      void loadPricing();
    }, 60000);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [baseFee, locationId, merchantId]);

  if (isLoading) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </GlassPanel>
    );
  }

  if (error || !pricingResult) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error ?? 'Surge pricing data is unavailable right now.'}</span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={`${className}`}>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              {pricingResult.isActive ? t('surge_pricing') : 'Delivery pricing'}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-2xl font-semibold text-[var(--color-ink)]">
                {formatCurrency(pricingResult.finalFee)}
              </p>
              <span className={`text-sm font-semibold ${getSurgeColor(pricingResult.multiplier)}`}>
                x{pricingResult.multiplier.toFixed(2)}
              </span>
            </div>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              pricingResult.isActive
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {pricingResult.isActive ? 'Live surge' : 'Standard'}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--color-muted)]">Base fee</span>
            <span className="font-medium text-[var(--color-ink)]">
              {formatCurrency(pricingResult.originalFee)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--color-muted)]">Surge impact</span>
            <span className="font-medium text-[var(--color-ink)]">
              {formatCurrency(pricingResult.surgeFee)}
            </span>
          </div>
        </div>

        {showDetails ? (
          <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4">
            <div className="flex items-start gap-2">
              <SparklesIcon className="mt-0.5 h-4 w-4 text-[var(--color-accent-strong)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">Why this price?</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{pricingResult.reason}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 h-4 w-4 text-[var(--color-accent-strong)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">Estimated wait time</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {pricingResult.estimatedWaitTime} minutes
                </p>
              </div>
            </div>

            {loadMeta ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-3 text-sm">
                  <p className="text-[var(--color-muted)]">Recent orders</p>
                  <p className="mt-1 font-semibold text-[var(--color-ink)]">{loadMeta.orderCount}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-3 text-sm">
                  <p className="text-[var(--color-muted)]">Available drivers</p>
                  <p className="mt-1 font-semibold text-[var(--color-ink)]">
                    {loadMeta.availableDrivers}
                  </p>
                </div>
              </div>
            ) : null}

            {refreshedAt ? (
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Refreshed {new Date(refreshedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </GlassPanel>
  );
}

export default SurgePricingIndicator;
