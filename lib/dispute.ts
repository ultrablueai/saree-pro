// Dispute Resolution Center for Saree Pro
// Manages dispute creation, investigation, and resolution

export interface Dispute {
  id: string;
  type: 'order' | 'payment' | 'delivery' | 'quality' | 'behavior' | 'fraud' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mediating' | 'resolved' | 'closed' | 'escalated';
  title: string;
  description: string;
  orderId?: string;
  transactionId?: string;
  raisedBy: string;
  respondentId?: string;
  category: {
    primary: string;
    secondary?: string;
  };
  evidence: Array<{
    id: string;
    type: 'image' | 'video' | 'document' | 'audio' | 'text';
    url: string;
    fileName?: string;
    description: string;
    uploadedBy: string;
    uploadedAt: Date;
    isPublic: boolean;
  }>;
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedAt: Date;
    evidence?: string[];
  }>;
  resolution?: {
    action: 'refund' | 'partial_refund' | 'credit' | 'discount' | 'apology' | 'compensation' | 'penalty' | 'warning';
    details: string;
    amount?: number;
    currency?: string;
    resolvedBy: string;
    resolvedAt: Date;
    finalDecision: string;
    appealDeadline?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  escalatedAt?: Date;
  resolvedAt?: Date;
}

export interface DisputeTemplate {
  id: string;
  type: Dispute['type'];
  title: string;
  description: string;
  categories: string[];
  requiredEvidence: string[];
  estimatedResolutionTime: string;
  severity: Dispute['severity'];
}

export interface DisputeFilter {
  type?: Dispute['type'];
  severity?: Dispute['severity'];
  status?: Dispute['status'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  involvedParty?: string;
  category?: string;
}

export interface MediationSession {
  id: string;
  disputeId: string;
  mediatorId: string;
  participants: Array<{
    userId: string;
    role: 'plaintiff' | 'defendant';
    joinedAt: Date;
    leftAt?: Date;
  }>;
  messages: Array<{
    id: string;
    userId: string;
    message: string;
    timestamp: Date;
    isMediator: boolean;
  }>;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  outcome?: {
    agreement: boolean;
    terms?: string;
    finalDecision?: string;
  };
}

export class DisputeService {
  private disputes: Map<string, Dispute> = new Map();
  private templates: Map<string, DisputeTemplate> = new Map();
  private mediations: Map<string, MediationSession> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Create new dispute
   */
  async createDispute(disputeData: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Dispute> {
    const dispute: Dispute = {
      id: this.generateId(),
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...disputeData,
    };

    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dispute),
      });

      const createdDispute: Dispute = await response.json();
      
      this.disputes.set(createdDispute.id, createdDispute);
      
      // Send notifications
      await this.notifyDisputeCreated(createdDispute);
      
      return createdDispute;
    } catch (error) {
      console.error('Failed to create dispute:', error);
      throw error;
    }
  }

  /**
   * Get dispute details
   */
  async getDispute(disputeId: string): Promise<Dispute | null> {
    try {
      const response = await fetch(`/api/disputes/${disputeId}`);
      const dispute: Dispute = await response.json();
      
      this.disputes.set(disputeId, dispute);
      return dispute;
    } catch (error) {
      console.error('Failed to get dispute:', error);
      return null;
    }
  }

  /**
   * Get disputes with filters
   */
  async getDisputes(
    userId?: string,
    filters?: DisputeFilter,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ disputes: Dispute[]; total: number }> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(userId && { userId }),
        ...this.buildFilterParams(filters),
      });

      const response = await fetch(`/api/disputes?${queryParams}`);
      const data = await response.json();
      
      // Update cache
      data.disputes.forEach((dispute: Dispute) => {
        this.disputes.set(dispute.id, dispute);
      });
      
      return {
        disputes: data.disputes,
        total: data.total,
      };
    } catch (error) {
      console.error('Failed to get disputes:', error);
      return { disputes: [], total: 0 };
    }
  }

  /**
   * Add evidence to dispute
   */
  async addEvidence(
    disputeId: string,
    userId: string,
    evidence: Omit<Dispute['evidence'][0], 'id' | 'uploadedBy' | 'uploadedAt'>
  ): Promise<Dispute['evidence'][0]> {
    const evidenceItem: Dispute['evidence'][0] = {
      id: this.generateId(),
      uploadedBy: userId,
      uploadedAt: new Date(),
      isPublic: false,
      ...evidence,
    };

    try {
      const response = await fetch(`/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evidenceItem),
      });

      const savedEvidence: Dispute['evidence'][0] = await response.json();
      
      // Update local cache
      const dispute = this.disputes.get(disputeId);
      if (dispute) {
        dispute.evidence.push(savedEvidence);
        dispute.updatedAt = new Date();
        this.disputes.set(disputeId, dispute);
      }
      
      return savedEvidence;
    } catch (error) {
      console.error('Failed to add evidence:', error);
      throw error;
    }
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(
    disputeId: string,
    status: Dispute['status'],
    updatedBy: string,
    reason?: string
  ): Promise<Dispute> {
    try {
      const response = await fetch(`/api/disputes/${disputeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          updatedBy,
          reason,
        }),
      });

      const updatedDispute: Dispute = await response.json();
      
      this.disputes.set(disputeId, updatedDispute);
      
      // Send notifications
      await this.notifyDisputeStatusChanged(updatedDispute, reason);
      
      return updatedDispute;
    } catch (error) {
      console.error('Failed to update dispute status:', error);
      throw error;
    }
  }

  /**
   * Add timeline entry
   */
  async addTimelineEntry(
    disputeId: string,
    action: string,
    description: string,
    performedBy: string,
    evidence?: string[]
  ): Promise<void> {
    const timelineEntry = {
      id: this.generateId(),
      action,
      description,
      performedBy,
      performedAt: new Date(),
      evidence,
    };

    try {
      await fetch(`/api/disputes/${disputeId}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timelineEntry),
      });

      // Update local cache
      const dispute = this.disputes.get(disputeId);
      if (dispute) {
        dispute.timeline.push(timelineEntry);
        dispute.updatedAt = new Date();
        this.disputes.set(disputeId, dispute);
      }
    } catch (error) {
      console.error('Failed to add timeline entry:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: Dispute['resolution']
  ): Promise<Dispute> {
    try {
      const response = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...resolution,
          resolvedAt: new Date(),
        }),
      });

      const resolvedDispute: Dispute = await response.json();
      
      this.disputes.set(disputeId, resolvedDispute);
      
      // Send notifications
      await this.notifyDisputeResolved(resolvedDispute);
      
      return resolvedDispute;
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      throw error;
    }
  }

  /**
   * Escalate dispute
   */
  async escalateDispute(
    disputeId: string,
    reason: string,
    escalatedBy: string
  ): Promise<Dispute> {
    try {
      const response = await fetch(`/api/disputes/${disputeId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          escalatedBy,
          escalatedAt: new Date(),
        }),
      });

      const escalatedDispute: Dispute = await response.json();
      
      this.disputes.set(disputeId, escalatedDispute);
      
      // Send notifications
      await this.notifyDisputeEscalated(escalatedDispute);
      
      return escalatedDispute;
    } catch (error) {
      console.error('Failed to escalate dispute:', error);
      throw error;
    }
  }

  /**
   * Create mediation session
   */
  async createMediationSession(
    disputeId: string,
    mediatorId: string,
    participants: Array<{ userId: string; role: 'plaintiff' | 'defendant' }>,
    scheduledAt: Date
  ): Promise<MediationSession> {
    const session: MediationSession = {
      id: this.generateId(),
      disputeId,
      mediatorId,
      participants: participants.map(p => ({
        ...p,
        joinedAt: new Date(),
      })),
      status: 'scheduled',
      scheduledAt,
    };

    try {
      const response = await fetch('/api/disputes/mediation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      const createdSession: MediationSession = await response.json();
      
      this.mediations.set(createdSession.id, createdSession);
      
      // Send notifications
      await this.notifyMediationScheduled(createdSession);
      
      return createdSession;
    } catch (error) {
      console.error('Failed to create mediation session:', error);
      throw error;
    }
  }

  /**
   * Get dispute templates
   */
  getDisputeTemplates(): DisputeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStatistics(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    averageResolutionTime: number;
    resolutionRate: number;
    escalationRate: number;
  }> {
    try {
      const queryParams = dateRange ? new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      }) : '';

      const response = await fetch(`/api/disputes/statistics?${queryParams}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get dispute statistics:', error);
      return {
        total: 0,
        byType: {},
        byStatus: {},
        bySeverity: {},
        averageResolutionTime: 0,
        resolutionRate: 0,
        escalationRate: 0,
      };
    }
  }

  /**
   * Build filter parameters
   */
  private buildFilterParams(filters?: DisputeFilter): Record<string, string> {
    if (!filters) return {};

    const params: Record<string, string> = {};
    
    if (filters.type) params.type = filters.type;
    if (filters.severity) params.severity = filters.severity;
    if (filters.status) params.status = filters.status;
    if (filters.involvedParty) params.involvedParty = filters.involvedParty;
    if (filters.category) params.category = filters.category;
    
    if (filters.dateRange) {
      params.startDate = filters.dateRange.start.toISOString();
      params.endDate = filters.dateRange.end.toISOString();
    }
    
    return params;
  }

  /**
   * Initialize dispute templates
   */
  private initializeTemplates(): void {
    const templates: DisputeTemplate[] = [
      {
        id: 'order_not_delivered',
        type: 'order',
        title: 'Order Not Delivered',
        description: 'Order was placed but never delivered',
        categories: ['Delivery', 'Order Fulfillment'],
        requiredEvidence: ['Order confirmation', 'Delivery address', 'Communication history'],
        estimatedResolutionTime: '3-5 business days',
        severity: 'medium',
      },
      {
        id: 'item_not_as_described',
        type: 'quality',
        title: 'Item Not as Described',
        description: 'Received item does not match description',
        categories: ['Product Quality', 'Misrepresentation'],
        requiredEvidence: ['Photos of item', 'Order description', 'Packaging photos'],
        estimatedResolutionTime: '2-4 business days',
        severity: 'medium',
      },
      {
        id: 'damaged_item',
        type: 'delivery',
        title: 'Damaged Item',
        description: 'Item arrived damaged during delivery',
        categories: ['Delivery', 'Packaging', 'Product Quality'],
        requiredEvidence: ['Photos of damage', 'Packaging condition', 'Delivery photos'],
        estimatedResolutionTime: '2-3 business days',
        severity: 'high',
      },
      {
        id: 'late_delivery',
        type: 'delivery',
        title: 'Late Delivery',
        description: 'Order delivered significantly later than promised',
        categories: ['Delivery', 'Service Quality'],
        requiredEvidence: ['Order confirmation', 'Delivery time proof', 'Communication history'],
        estimatedResolutionTime: '1-2 business days',
        severity: 'low',
      },
      {
        id: 'fraud',
        type: 'fraud',
        title: 'Fraudulent Activity',
        description: 'Suspected fraudulent transaction or behavior',
        categories: ['Security', 'Fraud'],
        requiredEvidence: ['Transaction details', 'Communication evidence', 'Suspicious activity logs'],
        estimatedResolutionTime: '5-7 business days',
        severity: 'critical',
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Notify dispute created
   */
  private async notifyDisputeCreated(dispute: Dispute): Promise<void> {
    try {
      await fetch('/api/notifications/dispute-created', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId: dispute.id,
          respondentId: dispute.respondentId,
          type: dispute.type,
          severity: dispute.severity,
        }),
      });
    } catch (error) {
      console.error('Failed to send dispute created notification:', error);
    }
  }

  /**
   * Notify dispute status changed
   */
  private async notifyDisputeStatusChanged(dispute: Dispute, reason?: string): Promise<void> {
    try {
      await fetch('/api/notifications/dispute-status-changed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId: dispute.id,
          status: dispute.status,
          reason,
        }),
      });
    } catch (error) {
      console.error('Failed to send dispute status notification:', error);
    }
  }

  /**
   * Notify dispute resolved
   */
  private async notifyDisputeResolved(dispute: Dispute): Promise<void> {
    try {
      await fetch('/api/notifications/dispute-resolved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId: dispute.id,
          resolution: dispute.resolution,
        }),
      });
    } catch (error) {
      console.error('Failed to send dispute resolved notification:', error);
    }
  }

  /**
   * Notify dispute escalated
   */
  private async notifyDisputeEscalated(dispute: Dispute): Promise<void> {
    try {
      await fetch('/api/notifications/dispute-escalated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId: dispute.id,
          escalatedAt: dispute.escalatedAt,
        }),
      });
    } catch (error) {
      console.error('Failed to send dispute escalated notification:', error);
    }
  }

  /**
   * Notify mediation scheduled
   */
  private async notifyMediationScheduled(session: MediationSession): Promise<void> {
    try {
      await fetch('/api/notifications/mediation-scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          disputeId: session.disputeId,
          scheduledAt: session.scheduledAt,
        }),
      });
    } catch (error) {
      console.error('Failed to send mediation scheduled notification:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const disputeService = new DisputeService();

// Utility functions
export function getDisputeTypeIcon(type: Dispute['type']): string {
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
}

export function getDisputeSeverityColor(severity: Dispute['severity']): string {
  const colorMap = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  
  return colorMap[severity] || 'text-gray-600';
}

export function getDisputeStatusColor(status: Dispute['status']): string {
  const colorMap = {
    open: 'text-blue-600',
    investigating: 'text-yellow-600',
    mediating: 'text-purple-600',
    resolved: 'text-green-600',
    closed: 'text-gray-600',
    escalated: 'text-red-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function formatDisputeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  
  return date.toLocaleDateString();
}
