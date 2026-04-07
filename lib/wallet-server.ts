import { getSessionUser } from "@/lib/auth";
import { getDbExecutor } from "@/lib/db";
import type {
  LoyaltyPoints,
  WalletAccount,
  WalletReward,
  WalletSnapshot,
  WalletTransaction,
} from "@/lib/wallet";

class WalletApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_default: number | boolean;
  created_at: string;
  updated_at: string;
}

interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  type: WalletTransaction["type"];
  amount: number;
  description: string;
  category: WalletTransaction["category"];
  status: WalletTransaction["status"];
  metadata_json: string | null;
  created_at: string;
  completed_at: string | null;
}

interface LoyaltyPointsRow {
  id: string;
  user_id: string;
  points: number;
  total_earned: number;
  total_spent: number;
  tier: LoyaltyPoints["tier"];
  next_tier_points: number;
  created_at: string;
  updated_at: string;
}

interface WalletRewardRow {
  id: string;
  title: string;
  description: string;
  type: WalletReward["type"];
  value_amount: number;
  points_cost: number;
  tier: WalletReward["tier"];
  category: WalletReward["category"];
  image_url: string | null;
  valid_until: string | null;
  is_active: number | boolean;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
}

function toBoolean(value: number | boolean | null | undefined) {
  return Boolean(value);
}

function parseMetadata(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as WalletTransaction["metadata"];
  } catch {
    return undefined;
  }
}

function mapWallet(row: WalletRow | undefined): WalletAccount | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    balance: row.balance,
    currency: row.currency,
    isDefault: toBoolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    walletId: row.wallet_id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    category: row.category,
    status: row.status,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapLoyalty(row: LoyaltyPointsRow | undefined): LoyaltyPoints | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    points: row.points,
    totalEarned: row.total_earned,
    totalSpent: row.total_spent,
    tier: row.tier,
    nextTierPoints: row.next_tier_points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReward(row: WalletRewardRow): WalletReward {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    value: row.value_amount,
    pointsCost: row.points_cost,
    tier: row.tier,
    category: row.category,
    imageUrl: row.image_url,
    validUntil: row.valid_until,
    isActive: toBoolean(row.is_active),
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    createdAt: row.created_at,
  };
}

export async function assertWalletAccess(targetUserId: string) {
  const session = await getSessionUser();

  if (!session) {
    throw new WalletApiError("Unauthorized", 401);
  }

  const canAccess =
    session.id === targetUserId || session.ownerAccess || session.role === "admin";

  if (!canAccess) {
    throw new WalletApiError("Forbidden", 403);
  }

  return session;
}

export function getWalletErrorResponse(error: unknown) {
  if (error instanceof WalletApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: "Internal wallet error" }, { status: 500 });
}

export async function getWalletSummaryByUserId(userId: string) {
  const db = await getDbExecutor();
  const wallet = await db.get<WalletRow>(
    `SELECT id, user_id, balance, currency, is_default, created_at, updated_at
     FROM wallets
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  return mapWallet(wallet);
}

export async function getWalletTransactionsByUserId(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const db = await getDbExecutor();
  const rows = await db.all<WalletTransactionRow>(
    `SELECT id, wallet_id, type, amount, description, category, status,
            metadata_json, created_at, completed_at
     FROM wallet_transactions
     WHERE user_id = ?
     ORDER BY datetime(created_at) DESC, id DESC
     LIMIT ?
     OFFSET ?`,
    [userId, limit, offset],
  );

  return rows.map(mapTransaction);
}

export async function getLoyaltyPointsByUserId(userId: string) {
  const db = await getDbExecutor();
  const row = await db.get<LoyaltyPointsRow>(
    `SELECT id, user_id, points, total_earned, total_spent, tier,
            next_tier_points, created_at, updated_at
     FROM loyalty_points
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  return mapLoyalty(row);
}

export async function getWalletRewardsByUserId(userId: string) {
  const [loyalty, db] = await Promise.all([getLoyaltyPointsByUserId(userId), getDbExecutor()]);
  const userTier = loyalty?.tier ?? "bronze";
  const rows = await db.all<WalletRewardRow>(
    `SELECT id, title, description, type, value_amount, points_cost, tier, category,
            image_url, valid_until, is_active, usage_limit, usage_count, created_at
     FROM loyalty_rewards
     WHERE is_active = 1
       AND (tier = 'all' OR tier = ?)
       AND (valid_until IS NULL OR datetime(valid_until) >= datetime('now'))
     ORDER BY points_cost ASC, created_at DESC`,
    [userTier],
  );

  return rows.map(mapReward);
}

export async function getWalletSnapshotByUserId(userId: string): Promise<WalletSnapshot> {
  const [wallet, transactions, loyaltyPoints, rewards] = await Promise.all([
    getWalletSummaryByUserId(userId),
    getWalletTransactionsByUserId(userId, 10, 0),
    getLoyaltyPointsByUserId(userId),
    getWalletRewardsByUserId(userId),
  ]);

  return {
    wallet,
    transactions,
    loyaltyPoints,
    rewards,
  };
}
