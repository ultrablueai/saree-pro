'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowPathIcon,
  BellAlertIcon,
  CreditCardIcon,
  GiftIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { useLocalization, useFormattedCurrency } from '../../hooks/useLocalization';
import {
  getLoyaltyProgress,
  getTierInfo,
  formatCurrency,
  walletService,
  type LoyaltyPoints,
  type WalletAccount,
  type WalletReward,
  type WalletTransaction,
} from '../../lib/wallet';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface WalletDashboardProps {
  userId: string;
  className?: string;
}

type WalletTab = 'balance' | 'transactions' | 'rewards' | 'points';

export function WalletDashboard({ userId, className = '' }: WalletDashboardProps) {
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [rewards, setRewards] = useState<WalletReward[]>([]);
  const [activeTab, setActiveTab] = useState<WalletTab>('balance');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useLocalization();
  const formatLocalizedCurrency = useFormattedCurrency();

  const loadWalletData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await walletService.getWalletSnapshot(userId, {
        transactionLimit: 10,
      });

      setWallet(snapshot.wallet);
      setTransactions(snapshot.transactions);
      setLoyaltyPoints(snapshot.loyaltyPoints);
      setRewards(snapshot.rewards);
    } catch (loadError) {
      console.error('Failed to load wallet data:', loadError);
      setError('Unable to load wallet data right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWalletData();
  }, [userId]);

  const currency = wallet?.currency ?? 'SAR';
  const balanceLabel = wallet ? formatLocalizedCurrency(wallet.balance) : formatCurrency(0, currency);
  const currentTier = useMemo(() => getTierInfo(loyaltyPoints?.points ?? 0), [loyaltyPoints?.points]);
  const progress = useMemo(() => {
    if (!loyaltyPoints) {
      return { current: 0, next: currentTier.minPoints, progress: 0 };
    }

    return getLoyaltyProgress(loyaltyPoints.points, loyaltyPoints.tier);
  }, [currentTier.minPoints, loyaltyPoints]);

  const tabs: Array<{ id: WalletTab; label: string; icon: ReactNode }> = [
    { id: 'balance', label: 'Balance', icon: <CreditCardIcon className="h-4 w-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <WalletIcon className="h-4 w-4" /> },
    { id: 'rewards', label: 'Rewards', icon: <GiftIcon className="h-4 w-4" /> },
    { id: 'points', label: 'Points', icon: <BellAlertIcon className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <GlassPanel className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center text-2xl font-bold text-gray-900 dark:text-white">
              <WalletIcon className="mr-3 h-6 w-6" />
              {t('wallet')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Read-only wallet snapshot backed by real GET endpoints.
            </p>
          </div>

          <PremiumButton
            onClick={loadWalletData}
            icon={<ArrowPathIcon className="h-4 w-4" />}
            size="sm"
          >
            Refresh
          </PremiumButton>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4 text-center dark:bg-blue-900/20">
            <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Current Balance</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{balanceLabel}</p>
          </div>

          <div className="rounded-2xl bg-green-50 p-4 text-center dark:bg-green-900/20">
            <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Loyalty Points</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {loyaltyPoints ? loyaltyPoints.points.toLocaleString() : '0'}
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-4 text-center dark:bg-purple-900/20">
            <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Current Tier</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{currentTier.icon}</span>
              <span className="text-lg font-bold capitalize">{currentTier.name}</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-2 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-700/70',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'balance' ? (
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Summary</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Live data from the backend, no local mutations.
              </p>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Read only
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Wallet ID</p>
              <p className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white">
                {wallet?.id ?? 'Not available yet'}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Currency</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{currency}</p>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === 'transactions' ? (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>

          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No transactions returned by the wallet endpoint yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {transaction.category} • {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={cn(
                        'font-semibold',
                        transaction.type === 'credit' || transaction.type === 'refund'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {transaction.type === 'credit' || transaction.type === 'refund' ? '+' : '-'}
                      {formatLocalizedCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      ) : null}

      {activeTab === 'rewards' ? (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Rewards</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Rewards are shown for visibility only. Claim flows stay on the backend side.
          </p>

          {rewards.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No rewards returned for this wallet.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{reward.title}</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {reward.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {reward.tier}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {reward.pointsCost} points
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{reward.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      ) : null}

      {activeTab === 'points' ? (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Loyalty Progress</h3>

          {loyaltyPoints ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Progress
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {loyaltyPoints.points.toLocaleString()} / {loyaltyPoints.nextTierPoints.toLocaleString()}{' '}
                    points
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${progress.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Total Earned</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {loyaltyPoints.totalEarned.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Total Spent</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {loyaltyPoints.totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loyalty data is not available for this account yet.
            </p>
          )}
        </GlassPanel>
      ) : null}
    </div>
  );
}

export default WalletDashboard;
