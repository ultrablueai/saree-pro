'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  UserIcon,
  CarIcon
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { kycService, KYCProfile, KYCDocument } from '../../lib/kyc';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { cn } from '../../lib/utils';

interface KYCDashboardProps {
  userId: string;
  role: 'driver' | 'admin';
  className?: string;
}

type KycTab = 'overview' | 'documents' | 'verification' | 'profile';

export function KYCDashboard({ userId, className = '' }: KYCDashboardProps) {
  const [profile, setProfile] = useState<KYCProfile | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [activeTab, setActiveTab] = useState<KycTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  useLocalization();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load KYC profile and documents
      const [profileData, documentsData] = await Promise.all([
        kycService.getKYCProfile(userId),
        kycService.getUserDocuments(userId),
      ]);
      
      setProfile(profileData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Failed to load KYC data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDocumentUpload = async (documentType: KYCDocument['documentType']) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsUploading(true);
          setUploadProgress(0);
          
          // Validate document
          const validation = kycService.validateDocument(file, documentType);
          if (!validation.isValid) {
            alert('Document validation failed: ' + validation.errors.join(', '));
            return;
          }
          
          // Upload with progress
          await kycService.uploadDocument(userId, documentType, file);
          
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 100) {
                clearInterval(progressInterval);
                setIsUploading(false);
                return 100;
              }
              return prev + 10;
            });
          }, 200);
          
          // Reload documents
          await loadData();
        } catch (error) {
          console.error('Failed to upload document:', error);
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    };
    fileInput.click();
  };

  const getDocumentTypeIcon = (documentType: KYCDocument['documentType']) => {
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
  };

  const getDocumentStatusColor = (status: KYCDocument['status']) => {
    const colorMap = {
      pending: 'text-yellow-600',
      under_review: 'text-blue-600',
      approved: 'text-green-600',
      rejected: 'text-red-600',
      expired: 'text-orange-600',
      requires_resubmission: 'text-purple-600',
    };
    
    return colorMap[status] || 'text-gray-600';
  };

  const getVerificationLevelColor = (level: KYCProfile['verificationLevel']) => {
    const colorMap = {
      basic: 'text-gray-600',
      standard: 'text-blue-600',
      enhanced: 'text-purple-600',
      premium: 'text-green-600',
    };
    
    return colorMap[level] || 'text-gray-600';
  };

  const getRiskLevelColor = (level: KYCProfile['riskLevel']) => {
    const colorMap = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      very_high: 'text-red-600',
    };
    
    return colorMap[level] || 'text-gray-600';
  };

  const renderDocumentCard = (document: KYCDocument) => (
    <GlassPanel key={document.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {getDocumentTypeIcon(document.documentType)}
          </div>
          
          <div>
            <h4 className="font-semibold capitalize">
              {document.documentType.replace('_', ' ')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {document.documentNumber}
            </p>
          </div>
        </div>
        
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          getDocumentStatusColor(document.status)
        )}>
          {document.status.toUpperCase()}
        </div>
      </div>

      {document.expiryDate && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Expires: {document.expiryDate.toLocaleDateString()}
          </p>
          {document.expiryDate < new Date() && (
            <p className="text-sm text-red-600">Document has expired</p>
          )}
        </div>
      )}

      {document.rejectionReason && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Rejection Reason: {document.rejectionReason}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <div>
          <p>Uploaded: {document.uploadedAt.toLocaleDateString()}</p>
          {document.reviewedAt && (
            <p>Reviewed: {document.reviewedAt.toLocaleDateString()}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(document.documentUrl, '_blank')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <EyeIcon className="w-4 h-4 text-gray-500" />
          </button>
          
          {document.status === 'rejected' && (
            <button
              onClick={() => handleDocumentUpload(document.documentType)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
            </button>
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
          <ShieldCheckIcon className="w-6 h-6 mr-3" />
          KYC Verification
        </h2>
        
        {profile?.status === 'verified' && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium">
              Verified
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'documents', label: 'Documents', icon: '📄' },
          { id: 'verification', label: 'Verification', icon: '🔍' },
          { id: 'profile', label: 'Profile', icon: '👤' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as KycTab)}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && profile && (
        <div className="space-y-6">
          {/* Status Overview */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold mb-4">Verification Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className={cn(
                  'text-2xl font-bold',
                  getVerificationLevelColor(profile.verificationLevel)
                )}>
                  {profile.verificationLevel.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Verification Level
                </p>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className={cn(
                  'text-2xl font-bold',
                  getRiskLevelColor(profile.riskLevel)
                )}>
                  {profile.riskScore}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Risk Score
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold capitalize">
                  {profile.status.replace('_', ' ')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Status
                </p>
              </div>
            </div>
          </GlassPanel>

          {/* Personal Information */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <UserIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Name</p>
                  <p className="font-medium">
                    {profile.personalInfo.firstName} {profile.personalInfo.lastName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Date of Birth</p>
                  <p className="font-medium">
                    {profile.personalInfo.dateOfBirth.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Nationality</p>
                  <p className="font-medium">{profile.personalInfo.nationality}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Address</p>
                  <p className="font-medium">
                    {profile.personalInfo.address.city}, {profile.personalInfo.address.country}
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Vehicle Information */}
          {profile.vehicleInfo && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <CarIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Vehicle</p>
                    <p className="font-medium">
                      {profile.vehicleInfo.make} {profile.vehicleInfo.model} ({profile.vehicleInfo.year})
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">License Plate</p>
                    <p className="font-medium">{profile.vehicleInfo.licensePlate}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            
            {isUploading && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-600">
                  Uploading... {uploadProgress}%
                </span>
              </div>
            )}
          </div>
          
          {/* Upload Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { type: 'id_card' as const, label: 'ID Card', required: true },
              { type: 'driving_license' as const, label: 'Driving License', required: true },
              { type: 'vehicle_registration' as const, label: 'Vehicle Registration', required: true },
              { type: 'insurance' as const, label: 'Insurance', required: false },
              { type: 'background_check' as const, label: 'Background Check', required: false },
              { type: 'address_proof' as const, label: 'Address Proof', required: false },
            ].map((doc) => (
              <button
                key={doc.type}
                onClick={() => handleDocumentUpload(doc.type)}
                disabled={isUploading}
                className={cn(
                  'p-4 border-2 rounded-lg transition-all',
                  documents.some(d => d.documentType === doc.type)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <div className="text-2xl mb-2">
                  {getDocumentTypeIcon(doc.type)}
                </div>
                <div className="text-sm font-medium">{doc.label}</div>
                {doc.required && (
                  <div className="text-xs text-red-600 mt-1">Required</div>
                )}
                
                {documents.some(d => d.documentType === doc.type) && (
                  <div className="text-xs text-green-600 mt-1">Uploaded</div>
                )}
              </button>
            ))}
          </div>
          
          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <DocumentTextIcon className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                No documents uploaded yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload your documents to start the verification process
              </p>
            </div>
          ) : (
            documents.map(renderDocumentCard)
          )}
        </div>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold mb-4">Verification Process</h3>
          
          <div className="space-y-4">
            {[
              { step: 1, title: 'Document Upload', description: 'Upload required documents', completed: documents.length > 0 },
              { step: 2, title: 'Document Review', description: 'Documents are reviewed by our team', completed: documents.some(d => d.status === 'under_review') },
              { step: 3, title: 'Background Check', description: 'Background verification process', completed: false },
              { step: 4, title: 'Final Approval', description: 'Final verification and approval', completed: profile?.status === 'verified' },
            ].map((step) => (
              <div key={step.step} className="flex items-center space-x-4">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  step.completed
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                )}>
                  {step.completed ? '✓' : step.step}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold mb-4">Complete Profile</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={profile.personalInfo.firstName}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={profile.personalInfo.lastName}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={profile.personalInfo.email}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={profile.personalInfo.phone}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={profile.personalInfo.address.city}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={profile.personalInfo.address.country}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled
                />
              </div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
