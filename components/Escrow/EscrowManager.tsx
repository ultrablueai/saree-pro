'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { useLocalization, useFormattedCurrency } from '../../hooks/useLocalization';
import { escrowService, EscrowTransaction, EscrowDispute, EscrowSettings } from '../../lib/escrow';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface EscrowManagerProps {
  userId: string;
  role: 'buyer' | 'seller' | 'admin';
  className?: string;
}

type EscrowTab = 'transactions' | 'disputes' | 'settings';

const ESCROW_DISPUTE_REASONS: EscrowDispute['reason'][] = [
  'item_not_delivered',
  'item_not_as_described',
  'damaged_item',
  'late_delivery',
  'fraud',
  'other',
];

function normalizeDisputeReason(reason: string): EscrowDispute['reason'] {
  const normalizedReason = reason.trim().toLowerCase().replace(/\s+/g, '_');

  return ESCROW_DISPUTE_REASONS.find(
    (disputeReason) => disputeReason === normalizedReason
  ) ?? 'other';
}

export function EscrowManager({ userId, role, className = '' }: EscrowManagerProps) {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [disputes, setDisputes] = useState<EscrowDispute[]>([]);
  const [settings, setSettings] = useState<EscrowSettings | null>(null);
  const [activeTab, setActiveTab] = useState<EscrowTab>('transactions');
  const [isLoading, setIsLoading] = useState(true);
  
  useLocalization();
  const formatCurrency = useFormattedCurrency();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load transactions
      const transactionsData = await escrowService.getUserTransactions(userId, role);
      setTransactions(transactionsData.transactions);
      
      // Load disputes
      const disputesData = await escrowService.getUserDisputes(userId);
      setDisputes(disputesData.disputes);
      
      // Load settings (admin only)
      if (role === 'admin') {
        const settingsData = await escrowService.getEscrowSettings();
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to load escrow data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleReleaseFunds = async (transactionId: string) => {
    try {
      await escrowService.releaseFunds(transactionId, userId);
      await loadData();
    } catch (error) {
      console.error('Failed to release funds:', error);
    }
  };

  const handleRefundFunds = async (transactionId: string) => {
    try {
      await escrowService.refundFunds(transactionId, userId, 'Refund requested');
      await loadData();
    } catch (error) {
      console.error('Failed to refund funds:', error);
    }
  };

  const handleRaiseDispute = async (transactionId: string) => {
    const reason = prompt('Dispute reason:');
    const description = prompt('Dispute description:');
    
    if (reason && description) {
      try {
        await escrowService.raiseDispute(
          transactionId,
          role === 'buyer' ? 'buyer' : 'seller',
          normalizeDisputeReason(reason),
          description
        );
        await loadData();
      } catch (error) {
        console.error('Failed to raise dispute:', error);
      }
    }
  };

  const handleResolveDispute = async (disputeId: string, action: EscrowDispute['resolution']['action']) => {
    try {
      await escrowService.resolveDispute(disputeId, {
        action,
        reason: `Dispute resolved by admin`,
        resolvedAt: new Date(),
        resolvedBy: userId,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  const getTransactionStatusColor = (status: EscrowTransaction['status']) => {
    const colorMap = {
      pending: 'text-yellow-600',
      held: 'text-blue-600',
      released: 'text-green-600',
      refunded: 'text-orange-600',
      disputed: 'text-red-600',
      cancelled: 'text-gray-600',
    };
    
    return colorMap[status] || 'text-gray-600';
  };

  const getDisputeStatusColor = (status: EscrowDispute['status']) => {
    const colorMap = {
      open: 'text-red-600',
      investigating: 'text-orange-600',
      resolved: 'text-green-600',
      closed: 'text-gray-600',
    };
    
    return colorMap[status] || 'text-gray-600';
  };

  const renderTransactionCard = (transaction: EscrowTransaction) => (
    <GlassPanel key={transaction.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-semibold">Transaction #{transaction.id.slice(-8)}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Order #{transaction.orderId}
            </p>
          </div>
        </div>
        
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          getTransactionStatusColor(transaction.status)
        )}>
          {transaction.status.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Amount</p>
          <p className="font-semibold text-lg">
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Hold Reason</p>
          <p className="text-sm">{transaction.holdReason}</p>
        </div>
      </div>

      {transaction.releaseConditions && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Release Conditions</p>
          <ul className="text-sm space-y-1">
            {transaction.releaseConditions.map((condition, index) => (
              <li key={index} className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div>
          <p>Created: {new Date(transaction.createdAt).toLocaleDateString()}</p>
          {transaction.heldAt && (
            <p>Held: {new Date(transaction.heldAt).toLocaleDateString()}</p>
          )}
          {transaction.expiresAt && (
            <p className="text-orange-600">
              Expires: {new Date(transaction.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
        
        {transaction.disputeId && (
          <div className="flex items-center space-x-1 text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Disputed</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {role === 'seller' && transaction.status === 'held' && (
          <PremiumButton
            size="sm"
            onClick={() => handleReleaseFunds(transaction.id)}
            icon={<ArrowUpTrayIcon className="w-4 h-4" />}
          >
            Release Funds
          </PremiumButton>
        )}
        
        {role === 'buyer' && (transaction.status === 'held' || transaction.status === 'disputed') && (
          <PremiumButton
            size="sm"
            variant="outline"
            onClick={() => handleRefundFunds(transaction.id)}
            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
          >
            Request Refund
          </PremiumButton>
        )}
        
        {!transaction.disputeId && transaction.status === 'held' && (
          <PremiumButton
            size="sm"
            variant="outline"
            onClick={() => handleRaiseDispute(transaction.id)}
            icon={<ScaleIcon className="w-4 h-4" />}
          >
            Raise Dispute
          </PremiumButton>
        )}
        
        <PremiumButton
          size="sm"
          variant="outline"
          onClick={() => setSelectedTransaction(transaction)}
          icon={<EyeIcon className="w-4 h-4" />}
        >
          View Details
        </PremiumButton>
      </div>
    </GlassPanel>
  );

  const renderDisputeCard = (dispute: EscrowDispute) => (
    <GlassPanel key={dispute.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <ScaleIcon className="w-5 h-5 text-red-600" />
          <div>
            <h4 className="font-semibold">Dispute #{dispute.id.slice(-8)}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Transaction #{dispute.transactionId.slice(-8)}
            </p>
          </div>
        </div>
        
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          getDisputeStatusColor(dispute.status)
        )}>
          {dispute.status.toUpperCase()}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Reason</p>
        <p className="font-medium">{dispute.reason}</p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Description</p>
        <p className="text-sm">{dispute.description}</p>
      </div>

      {dispute.evidence && dispute.evidence.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Evidence</p>
          <div className="space-y-2">
            {dispute.evidence.map((evidence, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{evidence.type}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {evidence.description}
                  </p>
                </div>
                <button
                  onClick={() => window.open(evidence.url, '_blank')}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {dispute.resolution && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            Resolution
          </p>
          <p className="text-sm">
            Action: {dispute.resolution.action}
          </p>
          <p className="text-sm">
            Reason: {dispute.resolution.reason}
          </p>
          {dispute.resolution.amount && (
            <p className="text-sm">
              Amount: {formatCurrency(dispute.resolution.amount)}
            </p>
          )}
        </div>
      )}

      {/* Admin Actions */}
      {role === 'admin' && dispute.status === 'open' && (
        <div className="flex items-center space-x-2">
          <PremiumButton
            size="sm"
            onClick={() => handleResolveDispute(dispute.id, 'refund_buyer')}
            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
          >
            Refund Buyer
          </PremiumButton>
          
          <PremiumButton
            size="sm"
            onClick={() => handleResolveDispute(dispute.id, 'release_to_seller')}
            icon={<ArrowUpTrayIcon className="w-4 h-4" />}
          >
            Release to Seller
          </PremiumButton>
          
          <PremiumButton
            size="sm"
            variant="outline"
            onClick={() => handleResolveDispute(dispute.id, 'partial_refund')}
            icon={<ScaleIcon className="w-4 h-4" />}
          >
            Partial Refund
          </PremiumButton>
        </div>
      )}
    </GlassPanel>
  );

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <ShieldCheckIcon className="w-6 h-6 mr-3" />
          Escrow Management
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => escrowService.processAutoReleases()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Process Auto-Releases
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {[
          { id: 'transactions', label: 'Transactions', icon: '💰' },
          { id: 'disputes', label: 'Disputes', icon: '⚖️' },
          ...(role === 'admin' ? [{ id: 'settings', label: 'Settings', icon: '⚙️' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as EscrowTab)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ShieldCheckIcon className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                No transactions yet
              </p>
            </div>
          ) : (
            transactions.map(renderTransactionCard)
          )}
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ScaleIcon className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                No disputes yet
              </p>
            </div>
          ) : (
            disputes.map(renderDisputeCard)
          )}
        </div>
      )}

      {activeTab === 'settings' && role === 'admin' && settings && (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold mb-4">Escrow Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Auto Release Hours</label>
              <input
                type="number"
                value={settings.autoReleaseHours}
                onChange={(e) => escrowService.updateEscrowSettings({ 
                  autoReleaseHours: parseInt(e.target.value) 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dispute Resolution Days</label>
              <input
                type="number"
                value={settings.disputeResolutionDays}
                onChange={(e) => escrowService.updateEscrowSettings({ 
                  disputeResolutionDays: parseInt(e.target.value) 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Hold Amount</label>
              <input
                type="number"
                value={settings.maxHoldAmount}
                onChange={(e) => escrowService.updateEscrowSettings({ 
                  maxHoldAmount: parseInt(e.target.value) 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fee Percentage</label>
              <input
                type="number"
                step="0.1"
                value={settings.feePercentage}
                onChange={(e) => escrowService.updateEscrowSettings({ 
                  feePercentage: parseFloat(e.target.value) 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
