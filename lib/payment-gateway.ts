/**
 * Payment Gateway Integration
 * 
 * Supports:
 * - Cash on Delivery (COD)
 * - Stripe (Credit/Debit Cards)
 * - Wallet Balance
 * - Split Payments
 */

import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor, type DbExecutor } from '@/lib/db';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

type PaymentMetadata = Record<string, unknown>;

export interface PaymentIntent {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'split';
  metadata?: PaymentMetadata;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  providerRef?: string;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  metadata?: PaymentMetadata;
}

interface PaymentOrderRow {
  id: string;
  total_amount: number;
  currency: string;
  payment_status: string;
}

interface WalletRow {
  id: string;
  balance: number;
}

interface PaymentTransactionRow {
  id: string;
  order_id: string;
  provider: string;
  provider_ref: string | null;
  amount: number;
  currency: string;
  status: PaymentResult['status'];
}

/**
 * Create Payment Intent
 */
export async function createPaymentIntent(payment: PaymentIntent): Promise<PaymentResult> {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify order exists and belongs to user
  const order = await db.get<PaymentOrderRow>(
    `SELECT * FROM orders WHERE id = ? AND customer_id = ?`,
    [payment.orderId, session.id]
  );

  if (!order) {
    return { success: false, error: 'Order not found', status: 'failed' };
  }

  // Check if already paid
  if (order.payment_status === 'paid') {
    return { success: false, error: 'Order already paid', status: 'failed' };
  }

  // Verify amount
  if (payment.amount !== order.total_amount) {
    return { success: false, error: 'Invalid payment amount', status: 'failed' };
  }

  const transactionId = randomUUID();

  try {
    switch (payment.paymentMethod) {
      case 'cash':
        return await processCashPayment(transactionId, order, db);
      
      case 'wallet':
        return await processWalletPayment(transactionId, order, session.id, db);
      
      case 'card':
        return await processCardPayment(transactionId, order, db);
      
      case 'split':
        return await processSplitPayment(transactionId, order, session.id, db);
      
      default:
        return { success: false, error: 'Invalid payment method', status: 'failed' };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed',
      status: 'failed',
    };
  }
}

/**
 * Process Cash Payment (COD)
 */
async function processCashPayment(
  transactionId: string,
  order: PaymentOrderRow,
  db: DbExecutor
): Promise<PaymentResult> {
  // Create pending transaction
  await db.run(
    `INSERT INTO payment_transactions (
      id, order_id, provider, provider_ref, amount, currency,
      status, processed_at, failure_reason, created_at
    ) VALUES (?, ?, 'cash', NULL, ?, ?, 'pending', NULL, NULL, datetime('now'))`,
    [transactionId, order.id, order.total_amount, order.currency]
  );

  return {
    success: true,
    transactionId,
    status: 'pending',
  };
}

/**
 * Process Wallet Payment
 */
async function processWalletPayment(
  transactionId: string,
  order: PaymentOrderRow,
  userId: string,
  db: DbExecutor
): Promise<PaymentResult> {
  // Get wallet
  const wallet = await db.get<WalletRow>(
    `SELECT * FROM wallets WHERE user_id = ?`,
    [userId]
  );

  if (!wallet) {
    return { success: false, error: 'Wallet not found', status: 'failed' };
  }

  // Check balance
  if (wallet.balance < order.total_amount / 100) {
    return {
      success: false,
      error: `Insufficient balance. Required: ${(order.total_amount / 100).toFixed(2)} ${order.currency}`,
      status: 'failed',
    };
  }

  // Deduct from wallet
  await db.run(
    `UPDATE wallets SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
    [order.total_amount / 100, wallet.id]
  );

  // Create transaction record
  await db.run(
    `INSERT INTO payment_transactions (
      id, order_id, provider, provider_ref, amount, currency,
      status, processed_at, failure_reason, created_at
    ) VALUES (?, ?, 'wallet', ?, ?, ?, 'completed', datetime('now'), NULL, datetime('now'))`,
    [transactionId, order.id, `WALLET-${wallet.id}`, order.total_amount, order.currency]
  );

  // Update order payment status
  await db.run(
    `UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`,
    [order.id]
  );

  // Create ledger entry
  await db.run(
    `INSERT INTO financial_ledger_entries (
      id, order_id, entry_type, party_type, party_id, amount, currency, note, created_at
    ) VALUES (?, ?, 'payment', 'customer', ?, ?, ?, 'Wallet payment', datetime('now'))`,
    [randomUUID(), order.id, userId, -order.total_amount, order.currency]
  );

  revalidatePath('/workspace/orders');
  
  return {
    success: true,
    transactionId,
    status: 'completed',
  };
}

/**
 * Process Card Payment (Stripe Integration)
 * Note: This is a placeholder. In production, integrate with Stripe SDK.
 */
async function processCardPayment(
  transactionId: string,
  order: PaymentOrderRow,
  db: DbExecutor
): Promise<PaymentResult> {
  // TODO: Integrate with Stripe
  // For now, create a pending transaction
  
  await db.run(
    `INSERT INTO payment_transactions (
      id, order_id, provider, provider_ref, amount, currency,
      status, processed_at, failure_reason, created_at
    ) VALUES (?, ?, 'stripe', NULL, ?, ?, 'pending', NULL, NULL, datetime('now'))`,
    [transactionId, order.id, order.total_amount, order.currency]
  );

  return {
    success: true,
    transactionId,
    status: 'processing',
    metadata: {
      stripePaymentIntentId: `pi_${transactionId}`,
      clientSecret: `pi_${transactionId}_secret_abc123`,
    },
  };
}

/**
 * Process Split Payment (Wallet + Card)
 */
async function processSplitPayment(
  transactionId: string,
  order: PaymentOrderRow,
  userId: string,
  db: DbExecutor
): Promise<PaymentResult> {
  // Get wallet
  const wallet = await db.get<WalletRow>(
    `SELECT * FROM wallets WHERE user_id = ?`,
    [userId]
  );

  if (!wallet) {
    return { success: false, error: 'Wallet not found', status: 'failed' };
  }

  // Calculate split
  const walletAmount = Math.min(wallet.balance * 100, order.total_amount);
  const cardAmount = order.total_amount - walletAmount;

  // Deduct from wallet
  if (walletAmount > 0) {
    await db.run(
      `UPDATE wallets SET balance = balance - ? WHERE id = ?`,
      [walletAmount / 100, wallet.id]
    );
  }

  // Create transaction record
  await db.run(
    `INSERT INTO payment_transactions (
      id, order_id, provider, provider_ref, amount, currency,
      status, processed_at, failure_reason, created_at
    ) VALUES (?, ?, 'split', ?, ?, ?, 'processing', NULL, NULL, datetime('now'))`,
    [transactionId, order.id, `SPLIT-WALLET-${wallet.id}`, order.total_amount, order.currency]
  );

  // Create ledger entries
  if (walletAmount > 0) {
    await db.run(
      `INSERT INTO financial_ledger_entries (
        id, order_id, entry_type, party_type, party_id, amount, currency, note, created_at
      ) VALUES (?, ?, 'payment', 'customer', ?, ?, ?, 'Wallet portion', datetime('now'))`,
      [randomUUID(), order.id, userId, -walletAmount, order.currency]
    );
  }

  return {
    success: true,
    transactionId,
    status: 'processing',
    metadata: {
      walletAmount,
      cardAmount,
      stripePaymentIntentId: `pi_${transactionId}`,
    },
  };
}

/**
 * Confirm Payment (for card payments)
 */
export async function confirmPayment(transactionId: string): Promise<PaymentResult> {
  const db = await getDbExecutor();

  const transaction = await db.get<PaymentTransactionRow>(
    `SELECT * FROM payment_transactions WHERE id = ?`,
    [transactionId]
  );

  if (!transaction) {
    return { success: false, error: 'Transaction not found', status: 'failed' };
  }

  if (transaction.status === 'completed') {
    return { success: true, transactionId, status: 'completed' };
  }

  // Update transaction status
  await db.run(
    `UPDATE payment_transactions 
     SET status = 'completed', processed_at = datetime('now') 
     WHERE id = ?`,
    [transactionId]
  );

  // Update order payment status
  await db.run(
    `UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') 
     WHERE id = ?`,
    [transaction.order_id]
  );

  revalidatePath('/workspace/orders');

  return { success: true, transactionId, status: 'completed' };
}

/**
 * Refund Payment
 */
export async function refundPayment(
  transactionId: string,
  reason: string
): Promise<PaymentResult> {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify user has permission (admin or owner)
  if (!['admin', 'owner'].includes(session.role)) {
    return { success: false, error: 'Unauthorized', status: 'failed' };
  }

  const transaction = await db.get<PaymentTransactionRow>(
    `SELECT * FROM payment_transactions WHERE id = ?`,
    [transactionId]
  );

  if (!transaction) {
    return { success: false, error: 'Transaction not found', status: 'failed' };
  }

  if (transaction.status !== 'completed') {
    return { success: false, error: 'Cannot refund non-completed transaction', status: 'failed' };
  }

  try {
    // Create refund transaction
    const refundId = randomUUID();
    await db.run(
      `INSERT INTO payment_transactions (
        id, order_id, provider, provider_ref, amount, currency,
        status, processed_at, failure_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'), ?, datetime('now'))`,
      [
        refundId,
        transaction.order_id,
        transaction.provider,
        transaction.provider_ref,
        -transaction.amount, // Negative amount for refund
        transaction.currency,
        reason,
      ]
    );

    // Update order payment status
    await db.run(
      `UPDATE orders SET payment_status = 'refunded', updated_at = datetime('now') 
       WHERE id = ?`,
      [transaction.order_id]
    );

    // Create ledger entry
    await db.run(
      `INSERT INTO financial_ledger_entries (
        id, order_id, entry_type, party_type, party_id, amount, currency, note, created_at
      ) VALUES (?, ?, 'refund', 'customer', NULL, ?, ?, ?, datetime('now'))`,
      [randomUUID(), transaction.order_id, transaction.amount, transaction.currency, reason]
    );

    revalidatePath('/workspace/orders');

    return { success: true, transactionId: refundId, status: 'completed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
      status: 'failed',
    };
  }
}

/**
 * Get Payment History
 */
export async function getPaymentHistory(orderId: string) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify access
  const order = await db.get<PaymentOrderRow>(
    `SELECT * FROM orders WHERE id = ? AND customer_id = ?`,
    [orderId, session.id]
  );

  if (!order) {
    return [];
  }

  const transactions = await db.all<PaymentTransactionRow>(
    `SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId]
  );

  return transactions;
}
