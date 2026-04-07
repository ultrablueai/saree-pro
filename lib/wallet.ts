// Read-only wallet and loyalty helpers for Saree Pro.
// This module intentionally relies on GET endpoints only.

export interface WalletAccount {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'refund' | 'reward' | 'bonus';
  amount: number;
  description: string;
  category: 'order' | 'refund' | 'reward' | 'bonus' | 'withdrawal' | 'deposit';
  status: 'pending' | 'completed' | 'failed';
  metadata?: {
    orderId?: string;
    rewardId?: string;
    bonusId?: string;
    reference?: string;
  };
  createdAt: string;
  completedAt?: string | null;
}

export interface LoyaltyPoints {
  id: string;
  userId: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  nextTierPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletReward {
  id: string;
  title: string;
  description: string;
  type: 'discount' | 'free_delivery' | 'bonus_points' | 'free_item' | 'cashback';
  value: number;
  pointsCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'all';
  category: 'food' | 'delivery' | 'general' | 'exclusive';
  imageUrl?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
  createdAt: string;
}

export interface WalletSnapshot {
  wallet: WalletAccount | null;
  transactions: WalletTransaction[];
  loyaltyPoints: LoyaltyPoints | null;
  rewards: WalletReward[];
}

export interface LoyaltyTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  minPoints: number;
  benefits: string[];
  color: string;
  icon: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    tier: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    benefits: [
      '1 point per 10 SAR spent',
      '5% off on birthday month',
      'Free delivery on orders over 50 SAR',
    ],
    color: '#CD7F32',
    icon: '🥉',
  },
  {
    tier: 'silver',
    name: 'Silver',
    minPoints: 500,
    benefits: [
      '1.2 points per 10 SAR spent',
      '10% off on birthday month',
      'Free delivery on all orders',
      'Exclusive silver rewards',
    ],
    color: '#C0C0C0',
    icon: '🥈',
  },
  {
    tier: 'gold',
    name: 'Gold',
    minPoints: 1500,
    benefits: [
      '1.5 points per 10 SAR spent',
      '15% off on birthday month',
      'Free delivery + priority support',
      'Exclusive gold rewards',
      'Double points weekends',
    ],
    color: '#FFD700',
    icon: '🥇',
  },
  {
    tier: 'platinum',
    name: 'Platinum',
    minPoints: 5000,
    benefits: [
      '2 points per 10 SAR spent',
      '20% off on birthday month',
      'Free delivery + priority support',
      'Exclusive platinum rewards',
      'Double points weekends',
      'Early access to new features',
    ],
    color: '#E5E4E2',
    icon: '🏆',
  },
  {
    tier: 'diamond',
    name: 'Diamond',
    minPoints: 10000,
    benefits: [
      '2.5 points per 10 SAR spent',
      '25% off on birthday month',
      'Free delivery + priority support',
      'Exclusive diamond rewards',
      'Triple points weekends',
      'Early access to new features',
      'Personal account manager',
      'Invitation to exclusive events',
    ],
    color: '#B9F2FF',
    icon: '💎',
  },
];

type FetchablePayload<T> =
  | T
  | {
      data?: T;
      wallet?: T;
      items?: T;
      results?: T;
      snapshot?: T;
      transactions?: T;
      rewards?: T;
      loyaltyPoints?: T;
      loyalty?: T;
      summary?: T;
    };

async function requestJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}`, error);
    return null;
  }
}

function unwrapPayload<T>(payload: FetchablePayload<T> | null | undefined): T | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    const keys = [
      'data',
      'wallet',
      'items',
      'results',
      'snapshot',
      'transactions',
      'rewards',
      'loyaltyPoints',
      'loyalty',
      'summary',
    ] as const;
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null) {
        return value as T;
      }
    }
  }

  return payload as T;
}

function normalizeArray<T>(payload: FetchablePayload<T[]> | null | undefined): T[] {
  const value = unwrapPayload(payload);
  return Array.isArray(value) ? value : [];
}

function normalizeObject<T>(payload: FetchablePayload<T> | null | undefined): T | null {
  const value = unwrapPayload(payload);
  return value ?? null;
}

function resolveCurrency(currency?: string | null): string {
  return currency || 'SAR';
}

function buildWalletBaseUrl(userId: string): string {
  return `/api/wallet/${encodeURIComponent(userId)}`;
}

export async function getWalletSummary(userId: string): Promise<WalletAccount | null> {
  const payload =
    (await requestJson<FetchablePayload<WalletAccount>>(buildWalletBaseUrl(userId))) ??
    (await requestJson<FetchablePayload<WalletAccount>>(`${buildWalletBaseUrl(userId)}/summary`));

  return normalizeObject(payload);
}

export const getUserWallet = getWalletSummary;

export async function getWalletTransactions(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<WalletTransaction[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const payload =
    (await requestJson<FetchablePayload<WalletTransaction[]>>(
      `${buildWalletBaseUrl(userId)}/transactions?${query.toString()}`,
    )) ??
    (await requestJson<FetchablePayload<WalletTransaction[]>>(
      `/api/wallet/transactions/${encodeURIComponent(userId)}?${query.toString()}`,
    ));

  return normalizeArray(payload);
}

export const getTransactionHistory = getWalletTransactions;

export async function getLoyaltyPoints(userId: string): Promise<LoyaltyPoints | null> {
  const payload =
    (await requestJson<FetchablePayload<LoyaltyPoints>>(
      `${buildWalletBaseUrl(userId)}/loyalty`,
    )) ??
    (await requestJson<FetchablePayload<LoyaltyPoints>>(
      `/api/loyalty/points/${encodeURIComponent(userId)}`,
    ));

  return normalizeObject(payload);
}

export async function getAvailableRewards(userId: string): Promise<WalletReward[]> {
  const query = new URLSearchParams({
    userId,
  });

  const payload =
    (await requestJson<FetchablePayload<WalletReward[]>>(
      `${buildWalletBaseUrl(userId)}/rewards`,
    )) ??
    (await requestJson<FetchablePayload<WalletReward[]>>(
      `/api/loyalty/rewards?${query.toString()}`,
    )) ??
    (await requestJson<FetchablePayload<WalletReward[]>>('/api/loyalty/rewards'));

  const rewards = normalizeArray(payload);
  const loyalty = await getLoyaltyPoints(userId);
  const userTier = loyalty?.tier ?? 'bronze';
  const now = Date.now();

  return rewards.filter((reward) => {
    if (!reward.isActive) {
      return false;
    }

    const validUntil = reward.validUntil ? new Date(reward.validUntil).getTime() : null;
    if (validUntil !== null && Number.isFinite(validUntil) && validUntil < now) {
      return false;
    }

    return reward.tier === 'all' || reward.tier === userTier;
  });
}

export const getRewards = getAvailableRewards;

export async function getWalletSnapshot(
  userId: string,
  options?: { transactionLimit?: number; transactionOffset?: number },
): Promise<WalletSnapshot> {
  const [wallet, transactions, loyaltyPoints, rewards] = await Promise.all([
    getWalletSummary(userId),
    getWalletTransactions(userId, options?.transactionLimit ?? 10, options?.transactionOffset ?? 0),
    getLoyaltyPoints(userId),
    getAvailableRewards(userId),
  ]);

  return {
    wallet,
    transactions,
    loyaltyPoints,
    rewards,
  };
}

export const walletService = {
  getUserWallet,
  getWalletSummary,
  getTransactionHistory,
  getWalletTransactions,
  getLoyaltyPoints,
  getAvailableRewards,
  getRewards,
  getWalletSnapshot,
};

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  const resolvedCurrency = resolveCurrency(currency);

  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: resolvedCurrency,
  }).format(amount);
}

export function getTierColor(tier: LoyaltyTier['tier']): string {
  const tierData = LOYALTY_TIERS.find((entry) => entry.tier === tier);
  return tierData?.color || '#CD7F32';
}

export function getTierIcon(tier: LoyaltyTier['tier']): string {
  const tierData = LOYALTY_TIERS.find((entry) => entry.tier === tier);
  return tierData?.icon || '🥉';
}

export function getTierInfo(points?: number | null) {
  if (points === undefined || points === null) {
    return LOYALTY_TIERS[0];
  }

  let currentTier = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.minPoints) {
      currentTier = tier;
    }
  }

  return currentTier;
}

export function calculatePointsToNextTier(
  currentPoints: number,
  currentTier: LoyaltyTier['tier'],
): number {
  const currentTierIndex = LOYALTY_TIERS.findIndex((tier) => tier.tier === currentTier);
  const nextTier = LOYALTY_TIERS[currentTierIndex + 1];

  if (!nextTier) return 0;

  return Math.max(0, nextTier.minPoints - currentPoints);
}

export function getLoyaltyProgress(
  currentPoints: number,
  currentTier: LoyaltyTier['tier'],
): { current: number; next: number; progress: number } {
  const currentTierIndex = LOYALTY_TIERS.findIndex((tier) => tier.tier === currentTier);
  const currentTierData = LOYALTY_TIERS[currentTierIndex] ?? LOYALTY_TIERS[0];
  const nextTierData = LOYALTY_TIERS[currentTierIndex + 1];

  if (!nextTierData) {
    return {
      current: currentTierData.minPoints,
      next: currentTierData.minPoints,
      progress: 100,
    };
  }

  const range = nextTierData.minPoints - currentTierData.minPoints;
  const progress = range > 0 ? ((currentPoints - currentTierData.minPoints) / range) * 100 : 0;

  return {
    current: currentTierData.minPoints,
    next: nextTierData.minPoints,
    progress: Math.min(100, Math.max(0, progress)),
  };
}
