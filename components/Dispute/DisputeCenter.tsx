'use client';

import { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  ScaleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { disputeService, Dispute, DisputeFilter, DisputeTemplate } from '../../lib/dispute';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface DisputeCenterProps {
  userId: string;
  role: 'customer' | 'merchant' | 'admin' | 'mediator';
  className?: string;
}

export function DisputeCenter({ userId, role, className = '' }: DisputeCenterProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [templates, setTemplates] = useState<DisputeTemplate[]>([]);
  const [filters, setFilters] = useState<DisputeFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [newDispute, setNewDispute] = useState({
    type: 'order' as Dispute['type'],
    title: '',
    description: '',
    category: { primary: '', secondary: '' },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { t } = useLocalization();

  useEffect(() => {
    loadData();
  }, [userId, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load disputes
      const disputesData = await disputeService.getDisputes(userId, filters);
      setDisputes(disputesData.disputes);
      
      // Load templates
      const templatesData = disputeService.getDisputeTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load disputes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!newDispute.title.trim() || !newDispute.description.trim()) return;

    try {
      setIsSubmitting(true);
      
      await disputeService.createDispute({
        type: newDispute.type,
        severity: 'medium',
        title: newDispute.title,
        description: newDispute.description,
        raisedBy: userId,
        category: newDispute.category,
      });

      // Reset form
      setNewDispute({
        type: 'order',
        title: '',
        description: '',
        category: { primary: '', secondary: '' },
      });
      setShowNewDispute(false);
      
      // Reload disputes
      await loadData();
    } catch (error) {
      console.error('Failed to create dispute:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (newFilters: DisputeFilter) => {
    setFilters(newFilters);
  };

  const handleAddEvidence = async (disputeId: string) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('disputeId', disputeId);
          formData.append('uploadedBy', userId);
          
          await fetch('/api/disputes/evidence', {
            method: 'POST',
            body: formData,
          });
          
          await loadData();
        } catch (error) {
          console.error('Failed to upload evidence:', error);
        }
      }
    };
    fileInput.click();
  };

  const getDisputeTypeIcon = (type: Dispute['type']) => {
    const iconMap = {
      order: '📦',
      payment: '💰',
      delivery: '🚚',
      quality: '⭐',
      behavior: '👤',
      fraud: '⚠️',
      other: '📋',
    };
    
    return iconMap[type] || '📋';
  };

  const getDisputeSeverityColor = (severity: Dispute['severity']) => {
    const colorMap = {
      low: 'border-blue-200 bg-blue-50 text-blue-700',
      medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
      high: 'border-orange-200 bg-orange-50 text-orange-700',
      critical: 'border-red-200 bg-red-50 text-red-700',
    };
    
    return colorMap[severity] || 'border-gray-200 bg-gray-50 text-gray-700';
  };

  const getDisputeStatusColor = (status: Dispute['status']) => {
    const colorMap = {
      open: 'text-blue-600',
      investigating: 'text-yellow-600',
      mediating: 'text-purple-600',
      resolved: 'text-green-600',
      closed: 'text-gray-600',
      escalated: 'text-red-600',
    };
    
    return colorMap[status] || 'text-gray-600';
  };

  const renderDisputeCard = (dispute: Dispute) => (
    <GlassPanel key={dispute.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {getDisputeTypeIcon(dispute.type)}
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {dispute.title}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                'px-2 py-1 text-xs rounded-full font-medium',
                getDisputeSeverityColor(dispute.severity)
              )}>
                {dispute.severity.toUpperCase()}
              </span>
              
              <span className={cn(
                'text-sm font-medium',
                getDisputeStatusColor(dispute.status)
              )}>
                {dispute.status.toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {dispute.category.primary}
              {dispute.category.secondary && ` • ${dispute.category.secondary}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddEvidence(dispute.id)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 text-gray-500" />
          </button>
          
          <button
            onClick={() => window.open(`/disputes/${dispute.id}`, '_blank')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <EyeIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {dispute.description}
      </p>

      {/* Evidence */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            Evidence ({dispute.evidence.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dispute.evidence.map((evidence, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{evidence.type}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
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

      {/* Timeline */}
      {dispute.timeline && dispute.timeline.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            Timeline
          </p>
          <div className="space-y-2">
            {dispute.timeline.slice(0, 3).map((entry, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {entry.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.performedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution */}
      {dispute.resolution && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            Resolution
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Action: {dispute.resolution.action}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {dispute.resolution.details}
          </p>
          {dispute.resolution.amount && (
            <p className="text-sm text-green-700 dark:text-green-300">
              Amount: {dispute.resolution.amount} {dispute.resolution.currency}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3">
        <div className="flex items-center space-x-2">
          <span>Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
          {dispute.escalatedAt && (
            <span>Escalated: {new Date(dispute.escalatedAt).toLocaleDateString()}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>By: {dispute.raisedBy}</span>
          {dispute.respondentId && (
            <span>vs {dispute.respondentId}</span>
          )}
        </div>
      </div>
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
          <ScaleIcon className="w-6 h-6 mr-3" />
          Dispute Center
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          {role !== 'customer' && (
            <PremiumButton
              onClick={() => setShowNewDispute(true)}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Dispute
            </PremiumButton>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <GlassPanel className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Filter Disputes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange({ ...filters, type: e.target.value as Dispute['type'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="order">Order</option>
                <option value="payment">Payment</option>
                <option value="delivery">Delivery</option>
                <option value="quality">Quality</option>
                <option value="behavior">Behavior</option>
                <option value="fraud">Fraud</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange({ ...filters, severity: e.target.value as Dispute['severity'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value as Dispute['status'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="mediating">Mediating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <input
                type="date"
                value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  ...filters, 
                  dateRange: { 
                    ...filters.dateRange, 
                    start: new Date(e.target.value) 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </GlassPanel>
      )}

      {/* New Dispute Form */}
      {showNewDispute && (
        <GlassPanel className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Dispute</h3>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Dispute Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setNewDispute({ ...newDispute, type: template.type })}
                    className={cn(
                      'p-3 border rounded-lg text-sm transition-colors',
                      newDispute.type === template.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    <div className="text-xl mb-1">{getDisputeTypeIcon(template.type)}</div>
                    <div className="font-medium">{template.title}</div>
                    <div className="text-xs text-gray-500">{template.estimatedResolutionTime}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newDispute.title}
                onChange={(e) => setNewDispute({ ...newDispute, title: e.target.value })}
                placeholder="Brief title for your dispute"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newDispute.description}
                onChange={(e) => setNewDispute({ ...newDispute, description: e.target.value })}
                placeholder="Detailed description of the issue"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                rows={4}
                maxLength={1000}
              />
            </div>

            {/* Submit Button */}
            <PremiumButton
              onClick={handleCreateDispute}
              disabled={isSubmitting || !newDispute.title.trim() || !newDispute.description.trim()}
              loading={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Creating...' : 'Create Dispute'}
            </PremiumButton>
          </div>
        </GlassPanel>
      )}

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ScaleIcon className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            No disputes found
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {role !== 'customer' && 'Create a new dispute to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">
            Disputes ({disputes.length})
          </h3>
          {disputes.map(renderDisputeCard)}
        </div>
      )}
    </div>
  );
}
