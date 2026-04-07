// Security and Compliance System for Saree Pro
// Manages GDPR, KVKK, and other regulatory compliance

export interface CompliancePolicy {
  id: string;
  type: 'gdpr' | 'kvkk' | 'pci_dss' | 'hipaa' | 'sox' | 'custom';
  name: string;
  description: string;
  version: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'active' | 'draft' | 'deprecated';
  requirements: ComplianceRequirement[];
  dataRetention: {
    personalData: number; // days
    financialData: number; // days
    auditLogs: number; // days
    documents: number; // days
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
    keyRotation: number; // days
  };
  access: {
    multiFactor: boolean;
    sessionTimeout: number; // minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      expiryDays: number;
    };
  };
  audit: {
    enabled: boolean;
    logLevel: 'basic' | 'detailed' | 'comprehensive';
    retentionDays: number;
    alerting: boolean;
  };
}

export interface ComplianceRequirement {
  id: string;
  category: 'data_protection' | 'privacy' | 'security' | 'accessibility' | 'business' | 'technical';
  requirement: string;
  description: string;
  mandatory: boolean;
  implementation: 'implemented' | 'partial' | 'not_implemented';
  evidence?: string[];
  lastReviewed?: Date;
  nextReview?: Date;
  owner?: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  userId: string;
  dataSubjectId: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  description: string;
  scope: string[];
  evidence?: string[];
  processedDate?: Date;
  completedDate?: Date;
  rejectionReason?: string;
  processedBy?: string;
  metadata?: {
    ipAddress: string;
    userAgent: string;
    verificationMethod: string;
  };
}

export interface SecurityAudit {
  id: string;
  type: 'vulnerability' | 'penetration' | 'compliance' | 'internal' | 'external';
  title: string;
  description: string;
  scope: string[];
  methodology: string;
  findings: SecurityFinding[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'remediated';
  scheduledDate?: Date;
  completedDate?: Date;
  nextAuditDate?: Date;
  auditor: string;
  reportUrl?: string;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: 'access_control' | 'encryption' | 'logging' | 'network' | 'application' | 'data';
  title: string;
  description: string;
  impact: string;
  likelihood: string;
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo?: string;
  dueDate?: Date;
  resolvedDate?: Date;
  evidence?: string[];
  cveId?: string;
  cvssScore?: number;
}

export interface ComplianceReport {
  id: string;
  reportType: 'gdpr' | 'kvkk' | 'security' | 'privacy' | 'quarterly' | 'annual';
  period: {
    start: Date;
    end: Date;
  };
  status: 'draft' | 'review' | 'approved' | 'published';
  content: {
    executiveSummary: string;
    complianceScore: number;
    requirementsStatus: Record<string, 'compliant' | 'non_compliant' | 'partial'>;
    findings: SecurityFinding[];
    recommendations: string[];
    actionItems: Array<{
      action: string;
      owner: string;
      dueDate: Date;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  };
  generatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  publishedAt?: Date;
}

export class SecurityComplianceService {
  private policies: Map<string, CompliancePolicy> = new Map();
  private requests: Map<string, DataSubjectRequest[]> = new Map();
  private audits: Map<string, SecurityAudit[]> = new Map();
  private reports: Map<string, ComplianceReport[]> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Get compliance policies
   */
  async getCompliancePolicies(): Promise<CompliancePolicy[]> {
    try {
      const response = await fetch('/api/compliance/policies');
      const policies: CompliancePolicy[] = await response.json();
      
      policies.forEach(policy => {
        this.policies.set(policy.id, policy);
      });
      
      return policies;
    } catch (error) {
      console.error('Failed to get compliance policies:', error);
      return Array.from(this.policies.values());
    }
  }

  /**
   * Create or update compliance policy
   */
  async createCompliancePolicy(policy: Omit<CompliancePolicy, 'id'>): Promise<CompliancePolicy> {
    const newPolicy: CompliancePolicy = {
      id: this.generateId(),
      ...policy,
    };

    try {
      const response = await fetch('/api/compliance/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPolicy),
      });

      const savedPolicy: CompliancePolicy = await response.json();
      this.policies.set(savedPolicy.id, savedPolicy);
      
      return savedPolicy;
    } catch (error) {
      console.error('Failed to create compliance policy:', error);
      throw error;
    }
  }

  /**
   * Handle data subject request
   */
  async handleDataSubjectRequest(
    request: Omit<DataSubjectRequest, 'id' | 'requestDate' | 'status'>
  ): Promise<DataSubjectRequest> {
    const newRequest: DataSubjectRequest = {
      id: this.generateId(),
      requestDate: new Date(),
      status: 'pending',
      ...request,
    };

    try {
      const response = await fetch('/api/compliance/data-subject-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequest),
      });

      const savedRequest: DataSubjectRequest = await response.json();
      
      // Update local cache
      const userRequests = this.requests.get(request.userId) || [];
      userRequests.push(savedRequest);
      this.requests.set(request.userId, userRequests);
      
      // Send notifications
      await this.notifyDataSubjectRequest(savedRequest);
      
      return savedRequest;
    } catch (error) {
      console.error('Failed to handle data subject request:', error);
      throw error;
    }
  }

  /**
   * Process data subject request
   */
  async processDataSubjectRequest(
    requestId: string,
    action: 'approve' | 'reject',
    notes?: string,
    processedBy: string
  ): Promise<DataSubjectRequest> {
    try {
      const response = await fetch(`/api/compliance/data-subject-request/${requestId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes,
          processedBy,
          processedDate: new Date(),
        }),
      });

      const processedRequest: DataSubjectRequest = await response.json();
      
      // Update local cache
      const userRequests = Array.from(this.requests.values()).flat();
      const index = userRequests.findIndex(req => req.id === requestId);
      if (index !== -1) {
        userRequests[index] = processedRequest;
      }
      
      // Send notifications
      await this.notifyDataSubjectRequestProcessed(processedRequest);
      
      return processedRequest;
    } catch (error) {
      console.error('Failed to process data subject request:', error);
      throw error;
    }
  }

  /**
   * Create security audit
   */
  async createSecurityAudit(audit: Omit<SecurityAudit, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityAudit> {
    const newAudit: SecurityAudit = {
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...audit,
    };

    try {
      const response = await fetch('/api/compliance/security-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAudit),
      });

      const savedAudit: SecurityAudit = await response.json();
      
      // Update local cache
      const audits = this.audits.get('all') || [];
      audits.push(savedAudit);
      this.audits.set('all', audits);
      
      return savedAudit;
    } catch (error) {
      console.error('Failed to create security audit:', error);
      throw error;
    }
  }

  /**
   * Add security finding
   */
  async addSecurityFinding(
    auditId: string,
    finding: Omit<SecurityFinding, 'id' | 'status'>
  ): Promise<SecurityFinding> {
    const newFinding: SecurityFinding = {
      id: this.generateId(),
      status: 'open',
      ...finding,
    };

    try {
      const response = await fetch(`/api/compliance/security-audit/${auditId}/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFinding),
      });

      const savedFinding: SecurityFinding = await response.json();
      
      // Update local cache
      const audit = this.audits.get('all')?.find(a => a.id === auditId);
      if (audit) {
        audit.findings = audit.findings || [];
        audit.findings.push(savedFinding);
      }
      
      return savedFinding;
    } catch (error) {
      console.error('Failed to add security finding:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    try {
      const response = await fetch('/api/compliance/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          period,
        }),
      });

      const report: ComplianceReport = await response.json();
      
      // Update local cache
      const reports = this.reports.get(reportType) || [];
      reports.push(report);
      this.reports.set(reportType, reports);
      
      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Get compliance score
   */
  async getComplianceScore(
    policyType: CompliancePolicy['type']
  ): Promise<{
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: Record<string, number>;
    lastUpdated: Date;
  }> {
    try {
      const response = await fetch(`/api/compliance/score/${policyType}`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Failed to get compliance score:', error);
      return {
        score: 0,
        grade: 'F',
        breakdown: {},
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Check GDPR compliance
   */
  async checkGDPRCompliance(): Promise<{
    isCompliant: boolean;
    score: number;
    issues: Array<{
      category: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const response = await fetch('/api/compliance/gdpr-check');
      return await response.json();
    } catch (error) {
      console.error('Failed to check GDPR compliance:', error);
      return {
        isCompliant: false,
        score: 0,
        issues: [],
        recommendations: [],
      };
    }
  }

  /**
   * Check KVKK compliance
   */
  async checkKVKKCompliance(): Promise<{
    isCompliant: boolean;
    score: number;
    issues: Array<{
      category: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const response = await fetch('/api/compliance/kvkk-check');
      return await response.json();
    } catch (error) {
      console.error('Failed to check KVKK compliance:', error);
      return {
        isCompliant: false,
        score: 0,
        issues: [],
        recommendations: [],
      };
    }
  }

  /**
   * Initialize default compliance policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: CompliancePolicy[] = [
      {
        id: 'gdpr-2024',
        type: 'gdpr',
        name: 'General Data Protection Regulation',
        description: 'EU GDPR compliance policy for data protection and privacy',
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active',
        requirements: [
          {
            id: 'gdpr-1',
            category: 'data_protection',
            requirement: 'Lawful basis for processing',
            description: 'All personal data processing must have a lawful basis',
            mandatory: true,
            implementation: 'implemented',
            risk: 'high',
          },
          {
            id: 'gdpr-2',
            category: 'privacy',
            requirement: 'Data subject rights',
            description: 'Implement data subject access, rectification, and erasure rights',
            mandatory: true,
            implementation: 'implemented',
            risk: 'high',
          },
        ],
        dataRetention: {
          personalData: 365,
          financialData: 2555,
          auditLogs: 1825,
          documents: 2555,
        },
        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'AES-256',
          keyRotation: 90,
        },
        access: {
          multiFactor: true,
          sessionTimeout: 30,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            expiryDays: 90,
          },
        },
        audit: {
          enabled: true,
          logLevel: 'comprehensive',
          retentionDays: 1825,
          alerting: true,
        },
      },
      {
        id: 'kvkk-2024',
        type: 'kvkk',
        name: 'KVKK Compliance',
        description: 'Turkish Personal Data Protection Law compliance',
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active',
        requirements: [
          {
            id: 'kvkk-1',
            category: 'data_protection',
            requirement: 'Explicit consent',
            description: 'Obtain explicit consent for personal data processing',
            mandatory: true,
            implementation: 'implemented',
            risk: 'high',
          },
          {
            id: 'kvkk-2',
            category: 'privacy',
            requirement: 'Data localization',
            description: 'Store Turkish citizens data within Turkey',
            mandatory: true,
            implementation: 'partial',
            risk: 'medium',
          },
        ],
        dataRetention: {
          personalData: 730,
          financialData: 2555,
          auditLogs: 1825,
          documents: 1825,
        },
        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'AES-256',
          keyRotation: 60,
        },
        access: {
          multiFactor: true,
          sessionTimeout: 20,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            expiryDays: 60,
          },
        },
        audit: {
          enabled: true,
          logLevel: 'detailed',
          retentionDays: 1825,
          alerting: true,
        },
      },
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  /**
   * Notify data subject request
   */
  private async notifyDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    try {
      await fetch('/api/notifications/data-subject-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          userId: request.userId,
          type: request.type,
        }),
      });
    } catch (error) {
      console.error('Failed to send data subject request notification:', error);
    }
  }

  /**
   * Notify data subject request processed
   */
  private async notifyDataSubjectRequestProcessed(request: DataSubjectRequest): Promise<void> {
    try {
      await fetch('/api/notifications/data-subject-request-processed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          userId: request.userId,
          status: request.status,
        }),
      });
    } catch (error) {
      console.error('Failed to send data subject request processed notification:', error);
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
export const securityComplianceService = new SecurityComplianceService();

// Utility functions
export function getComplianceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getRiskLevelColor(level: SecurityFinding['severity'] | 'low' | 'medium' | 'high' | 'critical'): string {
  const colorMap = {
    info: 'text-blue-600',
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  
  return colorMap[level] || 'text-gray-600';
}

export function getComplianceStatusColor(status: 'compliant' | 'non_compliant' | 'partial'): string {
  const colorMap = {
    compliant: 'text-green-600',
    non_compliant: 'text-red-600',
    partial: 'text-yellow-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function formatDataRetentionDays(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}

export function getPolicyTypeIcon(type: CompliancePolicy['type']): string {
  const iconMap = {
    gdpr: '🇪🇺',
    kvkk: '🇹🇷',
    pci_dss: '💳',
    hipaa: '🏥',
    sox: '📊',
    custom: '⚙️',
  };
  
  return iconMap[type] || '📋';
}
