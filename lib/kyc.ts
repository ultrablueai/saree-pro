// KYC (Know Your Customer) System for Saree Pro
// Manages driver verification and compliance

export interface KYCDocument {
  id: string;
  userId: string;
  documentType: 'id_card' | 'driving_license' | 'vehicle_registration' | 'insurance' | 'background_check' | 'criminal_check' | 'address_proof' | 'bank_account' | 'tax_id';
  documentNumber: string;
  documentUrl: string;
  documentHash: string;
  expiryDate?: Date;
  issuedDate?: Date;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'requires_resubmission';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  uploadedAt: Date;
  metadata?: {
    country: string;
    state?: string;
    city?: string;
    documentTypeCode: string;
    verificationMethod: 'manual' | 'automated' | 'third_party';
    confidence?: number;
  };
}

export interface KYCProfile {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected' | 'suspended';
  verificationLevel: 'basic' | 'standard' | 'enhanced' | 'premium';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  documents: KYCDocument[];
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationality: string;
    gender: 'male' | 'female' | 'other';
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
  };
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'truck' | 'van';
    registrationNumber: string;
    insuranceExpiry: Date;
    inspectionExpiry?: Date;
  };
  bankingInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
  };
  compliance: {
    gdprCompliant: boolean;
    kvkkCompliant: boolean;
    dataProcessingConsent: boolean;
    termsAccepted: boolean;
    privacyPolicyAccepted: boolean;
    consentDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt?: Date;
  nextReviewDate?: Date;
}

export interface KYCVerification {
  id: string;
  profileId: string;
  type: 'identity' | 'address' | 'vehicle' | 'background' | 'financial';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: 'pass' | 'fail' | 'partial';
  score?: number;
  confidence?: number;
  details: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  metadata?: any;
}

export interface KYCSettings {
  id: string;
  documentRequirements: Record<string, string[]>;
  verificationLevels: {
    basic: string[];
    standard: string[];
    enhanced: string[];
    premium: string[];
  };
  autoApproval: {
    enabled: boolean;
    riskThreshold: number;
    requiredDocuments: string[];
  };
  monitoring: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    alerts: boolean;
  };
  compliance: {
    gdprEnabled: boolean;
    kvkkEnabled: boolean;
    dataRetentionDays: number;
    encryptionRequired: boolean;
  };
}

export class KYCService {
  private profiles: Map<string, KYCProfile> = new Map();
  private documents: Map<string, KYCDocument[]> = new Map();
  private verifications: Map<string, KYCVerification[]> = new Map();
  private settings: KYCSettings;

  constructor() {
    this.settings = {
      id: 'default',
      documentRequirements: {
        basic: ['id_card', 'phone', 'email'],
        standard: ['id_card', 'driving_license', 'vehicle_registration', 'background_check'],
        enhanced: ['id_card', 'driving_license', 'vehicle_registration', 'insurance', 'background_check', 'criminal_check'],
        premium: ['id_card', 'driving_license', 'vehicle_registration', 'insurance', 'background_check', 'criminal_check', 'address_proof', 'bank_account', 'tax_id'],
      },
      verificationLevels: {
        basic: ['identity', 'address'],
        standard: ['identity', 'address', 'vehicle'],
        enhanced: ['identity', 'address', 'vehicle', 'background', 'financial'],
        premium: ['identity', 'address', 'vehicle', 'background', 'financial', 'compliance'],
      },
      autoApproval: {
        enabled: true,
        riskThreshold: 30,
        requiredDocuments: ['id_card', 'driving_license'],
      },
      monitoring: {
        enabled: true,
        frequency: 'weekly',
        alerts: true,
      },
      compliance: {
        gdprEnabled: true,
        kvkkEnabled: true,
        dataRetentionDays: 365,
        encryptionRequired: true,
      },
    };
  }

  /**
   * Get user's KYC profile
   */
  async getKYCProfile(userId: string): Promise<KYCProfile | null> {
    try {
      const response = await fetch(`/api/kyc/profile/${userId}`);
      const profile: KYCProfile = await response.json();
      
      this.profiles.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Failed to get KYC profile:', error);
      return null;
    }
  }

  /**
   * Create or update KYC profile
   */
  async createKYCProfile(userId: string, profileData: Partial<KYCProfile>): Promise<KYCProfile> {
    try {
      const response = await fetch('/api/kyc/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...profileData,
        }),
      });

      const profile: KYCProfile = await response.json();
      
      this.profiles.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Failed to create KYC profile:', error);
      throw error;
    }
  }

  /**
   * Upload KYC document
   */
  async uploadDocument(
    userId: string,
    documentType: KYCDocument['documentType'],
    file: File,
    metadata?: KYCDocument['metadata']
  ): Promise<KYCDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('documentType', documentType);
    formData.append('documentNumber', this.generateDocumentNumber(documentType));
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    try {
      const response = await fetch('/api/kyc/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const document: KYCDocument = await response.json();
      
      // Update local cache
      const userDocuments = this.documents.get(userId) || [];
      userDocuments.push(document);
      this.documents.set(userId, userDocuments);
      
      return document;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  /**
   * Verify document
   */
  async verifyDocument(
    userId: string,
    documentId: string,
    verificationData: {
      approved: boolean;
      notes?: string;
      confidence?: number;
    }
  ): Promise<KYCDocument> {
    try {
      const response = await fetch(`/api/kyc/documents/${documentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      const document: KYCDocument = await response.json();
      
      // Update local cache
      const userDocuments = this.documents.get(userId) || [];
      const index = userDocuments.findIndex(doc => doc.id === documentId);
      if (index !== -1) {
        userDocuments[index] = document;
        this.documents.set(userId, userDocuments);
      }
      
      // Check if profile can be auto-approved
      await this.checkAutoApproval(userId);
      
      return document;
    } catch (error) {
      console.error('Failed to verify document:', error);
      throw error;
    }
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const response = await fetch(`/api/kyc/documents/${userId}`);
      const documents: KYCDocument[] = await response.json();
      
      this.documents.set(userId, documents);
      return documents;
    } catch (error) {
      console.error('Failed to get user documents:', error);
      return [];
    }
  }

  /**
   * Start verification process
   */
  async startVerification(
    userId: string,
    type: KYCVerification['type'],
    profileId?: string
  ): Promise<KYCVerification> {
    try {
      const response = await fetch('/api/kyc/verification/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type,
          profileId,
        }),
      });

      const verification: KYCVerification = await response.json();
      
      // Update local cache
      const userVerifications = this.verifications.get(userId) || [];
      userVerifications.push(verification);
      this.verifications.set(userId, userVerifications);
      
      return verification;
    } catch (error) {
      console.error('Failed to start verification:', error);
      throw error;
    }
  }

  /**
   * Complete verification
   */
  async completeVerification(
    verificationId: string,
    result: KYCVerification['result'],
    details: string,
    score?: number,
    confidence?: number
  ): Promise<KYCVerification> {
    try {
      const response = await fetch(`/api/kyc/verification/${verificationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result,
          details,
          score,
          confidence,
          completedAt: new Date(),
        }),
      });

      const verification: KYCVerification = await response.json();
      
      // Update user profile status
      await this.updateProfileStatus(verification.profileId);
      
      return verification;
    } catch (error) {
      console.error('Failed to complete verification:', error);
      throw error;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<{
    profile: KYCProfile;
    verifications: KYCVerification[];
    completionPercentage: number;
    nextSteps: string[];
  }> {
    try {
      const response = await fetch(`/api/kyc/status/${userId}`);
      const data = await response.json();
      
      return {
        profile: data.profile,
        verifications: data.verifications,
        completionPercentage: data.completionPercentage,
        nextSteps: data.nextSteps,
      };
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return {
        profile: {} as KYCProfile,
        verifications: [],
        completionPercentage: 0,
        nextSteps: [],
      };
    }
  }

  /**
   * Calculate risk score
   */
  async calculateRiskScore(userId: string): Promise<{
    score: number;
    level: 'low' | 'medium' | 'high' | 'very_high';
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`/api/kyc/risk-score/${userId}`);
      const data = await response.json();
      
      // Update profile with risk score
      const profile = this.profiles.get(userId);
      if (profile) {
        profile.riskScore = data.score;
        profile.riskLevel = data.level;
        this.profiles.set(userId, profile);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to calculate risk score:', error);
      return {
        score: 0,
        level: 'low',
        factors: [],
        recommendations: [],
      };
    }
  }

  /**
   * Get KYC settings
   */
  async getKYCSettings(): Promise<KYCSettings> {
    try {
      const response = await fetch('/api/kyc/settings');
      const settings: KYCSettings = await response.json();
      
      this.settings = settings;
      return settings;
    } catch (error) {
      console.error('Failed to get KYC settings:', error);
      return this.settings;
    }
  }

  /**
   * Update KYC settings
   */
  async updateKYCSettings(settings: Partial<KYCSettings>): Promise<KYCSettings> {
    try {
      const response = await fetch('/api/kyc/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const updatedSettings: KYCSettings = await response.json();
      
      this.settings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update KYC settings:', error);
      throw error;
    }
  }

  /**
   * Check for auto-approval
   */
  private async checkAutoApproval(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    const documents = this.documents.get(userId) || [];
    
    if (!profile || !this.settings.autoApproval.enabled) return;

    const requiredDocs = this.settings.autoApproval.requiredDocuments;
    const hasRequiredDocs = requiredDocs.every(docType => 
      documents.some(doc => doc.documentType === docType && doc.status === 'approved')
    );

    if (hasRequiredDocs && profile.riskScore <= this.settings.autoApproval.riskThreshold) {
      try {
        await fetch(`/api/kyc/profile/${userId}/auto-approve`, {
          method: 'POST',
        });
        
        // Update profile status
        profile.status = 'verified';
        profile.lastVerifiedAt = new Date();
        this.profiles.set(userId, profile);
      } catch (error) {
        console.error('Failed to auto-approve profile:', error);
      }
    }
  }

  /**
   * Update profile status
   */
  private async updateProfileStatus(profileId: string): Promise<void> {
    try {
      await fetch(`/api/kyc/profile/${profileId}/status`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to update profile status:', error);
    }
  }

  /**
   * Generate document number
   */
  private generateDocumentNumber(documentType: KYCDocument['documentType']): string {
    const prefix = documentType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
  }

  /**
   * Validate document
   */
  validateDocument(file: File, documentType: KYCDocument['documentType']): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported. Please upload JPEG, PNG, or PDF');
    }

    // Document-specific validations
    switch (documentType) {
      case 'id_card':
        if (file.size < 100 * 1024) {
          errors.push('ID card image too small. Minimum 100KB required');
        }
        break;
      case 'driving_license':
        if (file.size < 200 * 1024) {
          errors.push('Driving license image too small. Minimum 200KB required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    // In production, use proper encryption
    return btoa(data);
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    // In production, use proper decryption
    return atob(encryptedData);
  }
}

// Singleton instance
export const kycService = new KYCService();

// Utility functions
export function getDocumentTypeIcon(documentType: KYCDocument['documentType']): string {
  const iconMap = {
    id_card: '🆔',
    driving_license: '🪪',
    vehicle_registration: '🚗',
    insurance: '🛡️',
    background_check: '🔍',
    criminal_check: '⚖️',
    address_proof: '🏠',
    bank_account: '🏦',
    tax_id: '📄',
  };
  
  return iconMap[documentType] || '📄';
}

export function getDocumentStatusColor(status: KYCDocument['status']): string {
  const colorMap = {
    pending: 'text-yellow-600',
    under_review: 'text-blue-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    expired: 'text-orange-600',
    requires_resubmission: 'text-purple-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function getVerificationLevelColor(level: KYCProfile['verificationLevel']): string {
  const colorMap = {
    basic: 'text-gray-600',
    standard: 'text-blue-600',
    enhanced: 'text-purple-600',
    premium: 'text-green-600',
  };
  
  return colorMap[level] || 'text-gray-600';
}

export function getRiskLevelColor(level: KYCProfile['riskLevel']): string {
  const colorMap = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    very_high: 'text-red-600',
  };
  
  return colorMap[level] || 'text-gray-600';
}

export function formatKYCDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
