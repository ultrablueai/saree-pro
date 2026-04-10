// Escrow System for Saree Pro
// Manages secure payment holding and release for transactions

export interface EscrowAccount {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed' | 'cancelled';
  holdReason: string;
  releaseConditions: string[];
  disputeId?: string;
  metadata?: {
    orderItems?: Array<Record<string, unknown>>;
    deliveryFee?: number;
    serviceFee?: number;
    insurance?: boolean;
  };
  createdAt: Date;
  heldAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  expiresAt: Date;
}

export interface EscrowDispute {
  id: string;
  transactionId: string;
  raisedBy: 'buyer' | 'seller' | 'system';
  reason: 'item_not_delivered' | 'item_not_as_described' | 'damaged_item' | 'late_delivery' | 'fraud' | 'other';
  description: string;
  evidence: Array<{
    type: 'image' | 'video' | 'document' | 'text';
    url: string;
    description: string;
    uploadedAt: Date;
  }>;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: {
    action: 'refund_buyer' | 'release_to_seller' | 'partial_refund' | 'cancel';
    amount?: number;
    reason: string;
    resolvedAt: Date;
    resolvedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowSettings {
  id: string;
  autoReleaseHours: number;
  disputeResolutionDays: number;
  maxHoldAmount: number;
  requireVerification: boolean;
  insuranceEnabled: boolean;
  insurancePercentage: number;
  feePercentage: number;
  minFee: number;
  maxFee: number;
}

export class EscrowService {
  private accounts: Map<string, EscrowAccount> = new Map();
  private transactions: Map<string, EscrowTransaction> = new Map();
  private disputes: Map<string, EscrowDispute> = new Map();
  private settings: EscrowSettings;

  constructor() {
    this.settings = {
      id: 'default',
      autoReleaseHours: 24,
      disputeResolutionDays: 7,
      maxHoldAmount: 10000,
      requireVerification: true,
      insuranceEnabled: true,
      insurancePercentage: 2,
      feePercentage: 1.5,
      minFee: 1,
      maxFee: 50,
    };
  }

  /**
   * Get user's escrow account
   */
  async getEscrowAccount(userId: string): Promise<EscrowAccount | null> {
    try {
      const response = await fetch(`/api/escrow/account/${userId}`);
      const account: EscrowAccount = await response.json();
      
      this.accounts.set(userId, account);
      return account;
    } catch (error) {
      console.error('Failed to get escrow account:', error);
      return null;
    }
  }

  /**
   * Create escrow account
   */
  async createEscrowAccount(userId: string, currency: string = 'SAR'): Promise<EscrowAccount> {
    try {
      const response = await fetch('/api/escrow/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currency,
          balance: 0,
        }),
      });

      const account: EscrowAccount = await response.json();
      this.accounts.set(userId, account);
      return account;
    } catch (error) {
      console.error('Failed to create escrow account:', error);
      throw error;
    }
  }

  /**
   * Hold funds in escrow
   */
  async holdFunds(
    orderId: string,
    buyerId: string,
    sellerId: string,
    amount: number,
    currency: string,
    holdReason: string,
    releaseConditions: string[],
    metadata?: EscrowTransaction['metadata']
  ): Promise<EscrowTransaction> {
    // Validate amount
    if (amount > this.settings.maxHoldAmount) {
      throw new Error(`Amount exceeds maximum hold limit of ${this.settings.maxHoldAmount} ${currency}`);
    }

    const transaction: EscrowTransaction = {
      id: this.generateId(),
      orderId,
      buyerId,
      sellerId,
      amount,
      currency,
      status: 'pending',
      holdReason,
      releaseConditions,
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (this.settings.autoReleaseHours * 60 * 60 * 1000)),
    };

    try {
      // Process payment and hold in escrow
      const response = await fetch('/api/escrow/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      const heldTransaction: EscrowTransaction = await response.json();
      
      this.transactions.set(heldTransaction.id, heldTransaction);
      
      // Update buyer's escrow account
      await this.updateAccountBalance(buyerId, amount);
      
      return heldTransaction;
    } catch (error) {
      console.error('Failed to hold funds:', error);
      throw error;
    }
  }

  /**
   * Release funds to seller
   */
  async releaseFunds(
    transactionId: string,
    releasedBy: string,
    reason?: string
  ): Promise<EscrowTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'held') {
      throw new Error('Transaction is not in held status');
    }

    try {
      const response = await fetch('/api/escrow/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          releasedBy,
          reason,
        }),
      });

      const releasedTransaction: EscrowTransaction = await response.json();
      
      this.transactions.set(transactionId, releasedTransaction);
      
      // Update seller's escrow account
      await this.updateAccountBalance(transaction.sellerId, -transaction.amount);
      
      return releasedTransaction;
    } catch (error) {
      console.error('Failed to release funds:', error);
      throw error;
    }
  }

  /**
   * Refund funds to buyer
   */
  async refundFunds(
    transactionId: string,
    refundedBy: string,
    reason: string,
    partialAmount?: number
  ): Promise<EscrowTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'held' && transaction.status !== 'disputed') {
      throw new Error('Transaction cannot be refunded');
    }

    try {
      const response = await fetch('/api/escrow/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          refundedBy,
          reason,
          partialAmount,
        }),
      });

      const refundedTransaction: EscrowTransaction = await response.json();
      
      this.transactions.set(transactionId, refundedTransaction);
      
      // Update buyer's escrow account
      const refundAmount = partialAmount || transaction.amount;
      await this.updateAccountBalance(transaction.buyerId, -refundAmount);
      
      return refundedTransaction;
    } catch (error) {
      console.error('Failed to refund funds:', error);
      throw error;
    }
  }

  /**
   * Raise dispute
   */
  async raiseDispute(
    transactionId: string,
    raisedBy: 'buyer' | 'seller',
    reason: EscrowDispute['reason'],
    description: string,
    evidence?: EscrowDispute['evidence']
  ): Promise<EscrowDispute> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const dispute: EscrowDispute = {
      id: this.generateId(),
      transactionId,
      raisedBy,
      reason,
      description,
      evidence: evidence || [],
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const response = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dispute),
      });

      const savedDispute: EscrowDispute = await response.json();
      
      this.disputes.set(savedDispute.id, savedDispute);
      
      // Update transaction status
      const updatedTransaction = {
        ...transaction,
        status: 'disputed' as const,
        disputeId: savedDispute.id,
      };
      
      this.transactions.set(transactionId, updatedTransaction);
      
      return savedDispute;
    } catch (error) {
      console.error('Failed to raise dispute:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: EscrowDispute['resolution'],
    resolvedBy: string
  ): Promise<EscrowDispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    try {
      const response = await fetch('/api/escrow/dispute/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId,
          resolution: {
            ...resolution,
            resolvedAt: new Date(),
            resolvedBy,
          },
        }),
      });

      const resolvedDispute: EscrowDispute = await response.json();
      
      this.disputes.set(disputeId, resolvedDispute);
      
      // Execute resolution action
      const transaction = this.transactions.get(resolvedDispute.transactionId);
      if (transaction && resolution) {
        switch (resolution.action) {
          case 'refund_buyer':
            await this.refundFunds(transaction.id, resolvedBy, 'Dispute resolved in favor of buyer');
            break;
          case 'release_to_seller':
            await this.releaseFunds(transaction.id, resolvedBy, 'Dispute resolved in favor of seller');
            break;
          case 'partial_refund':
            await this.refundFunds(transaction.id, resolvedBy, 'Partial refund due to dispute', resolution.amount);
            await this.releaseFunds(transaction.id, resolvedBy, 'Partial release to seller', transaction.amount - (resolution.amount || 0));
            break;
          case 'cancel':
            // Cancel transaction and refund both parties
            await this.refundFunds(transaction.id, resolvedBy, 'Transaction cancelled');
            break;
        }
      }
      
      return resolvedDispute;
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<EscrowTransaction | null> {
    try {
      const response = await fetch(`/api/escrow/transaction/${transactionId}`);
      const transaction: EscrowTransaction = await response.json();
      
      this.transactions.set(transactionId, transaction);
      return transaction;
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return null;
    }
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(
    userId: string,
    role: 'buyer' | 'seller',
    status?: EscrowTransaction['status'],
    limit: number = 20,
    offset: number = 0
  ): Promise<{ transactions: EscrowTransaction[]; total: number }> {
    try {
      const queryParams = new URLSearchParams({
        userId,
        role,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(status && { status }),
      });

      const response = await fetch(`/api/escrow/transactions?${queryParams}`);
      const data = await response.json();
      
      return {
        transactions: data.transactions,
        total: data.total,
      };
    } catch (error) {
      console.error('Failed to get user transactions:', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Get dispute details
   */
  async getDispute(disputeId: string): Promise<EscrowDispute | null> {
    try {
      const response = await fetch(`/api/escrow/dispute/${disputeId}`);
      const dispute: EscrowDispute = await response.json();
      
      this.disputes.set(disputeId, dispute);
      return dispute;
    } catch (error) {
      console.error('Failed to get dispute:', error);
      return null;
    }
  }

  /**
   * Get user's disputes
   */
  async getUserDisputes(
    userId: string,
    status?: EscrowDispute['status'],
    limit: number = 20,
    offset: number = 0
  ): Promise<{ disputes: EscrowDispute[]; total: number }> {
    try {
      const queryParams = new URLSearchParams({
        userId,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(status && { status }),
      });

      const response = await fetch(`/api/escrow/disputes?${queryParams}`);
      const data = await response.json();
      
      return {
        disputes: data.disputes,
        total: data.total,
      };
    } catch (error) {
      console.error('Failed to get user disputes:', error);
      return { disputes: [], total: 0 };
    }
  }

  /**
   * Auto-release expired transactions
   */
  async processAutoReleases(): Promise<void> {
    try {
      const response = await fetch('/api/escrow/auto-release', {
        method: 'POST',
      });

      const releasedTransactions: EscrowTransaction[] = await response.json();
      
      // Update local cache
      releasedTransactions.forEach(transaction => {
        this.transactions.set(transaction.id, transaction);
      });
      
      console.log(`Auto-released ${releasedTransactions.length} expired transactions`);
    } catch (error) {
      console.error('Failed to process auto-releases:', error);
    }
  }

  /**
   * Get escrow settings
   */
  async getEscrowSettings(): Promise<EscrowSettings> {
    try {
      const response = await fetch('/api/escrow/settings');
      const settings: EscrowSettings = await response.json();
      
      this.settings = settings;
      return settings;
    } catch (error) {
      console.error('Failed to get escrow settings:', error);
      return this.settings;
    }
  }

  /**
   * Update escrow settings
   */
  async updateEscrowSettings(settings: Partial<EscrowSettings>): Promise<EscrowSettings> {
    try {
      const response = await fetch('/api/escrow/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const updatedSettings: EscrowSettings = await response.json();
      
      this.settings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update escrow settings:', error);
      throw error;
    }
  }

  /**
   * Update account balance
   */
  private async updateAccountBalance(userId: string, amount: number): Promise<void> {
    try {
      await fetch('/api/escrow/account/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount,
        }),
      });
    } catch (error) {
      console.error('Failed to update account balance:', error);
    }
  }

  /**
   * Calculate escrow fee
   */
  calculateFee(amount: number): number {
    const percentageFee = (amount * this.settings.feePercentage) / 100;
    return Math.max(this.settings.minFee, Math.min(this.settings.maxFee, percentageFee));
  }

  /**
   * Calculate insurance amount
   */
  calculateInsurance(amount: number): number {
    return (amount * this.settings.insurancePercentage) / 100;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const escrowService = new EscrowService();

// Utility functions
export function getTransactionStatusColor(status: EscrowTransaction['status']): string {
  const colorMap = {
    pending: 'text-yellow-600',
    held: 'text-blue-600',
    released: 'text-green-600',
    refunded: 'text-orange-600',
    disputed: 'text-red-600',
    cancelled: 'text-gray-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function getDisputeStatusColor(status: EscrowDispute['status']): string {
  const colorMap = {
    open: 'text-red-600',
    investigating: 'text-orange-600',
    resolved: 'text-green-600',
    closed: 'text-gray-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function formatEscrowAmount(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getTimeUntilExpiry(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${minutes}m`;
}
