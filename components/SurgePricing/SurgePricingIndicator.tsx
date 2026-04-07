'use client';

import { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  ClockIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { useFormattedCurrency } from '../../hooks/useLocalization';
import { 
  surgePricingEngine, 
  SurgePricingResult, 
  getSurgeColor 
} from '../../lib/surge-pricing';
import { GlassPanel } from '../PremiumUI/GlassPanel';

interface SurgePricingIndicatorProps {
  locationId: string;
  baseFee?: number;
  className?: string;
  showDetails?: boolean;
  onPricingChange?: (result: SurgePricingResult) => void;
}

export function SurgePricingIndicator({
  locationId,
  baseFee,
  className = '',
  showDetails = true,
  onPricingChange,
}: SurgePricingIndicatorProps) {
  const [pricingResult, setPricingResult] = useState<SurgePricingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLocalization();
  const formatCurrency = useFormattedCurrency();

  useEffect(() => {
    const calculatePricing = () => {
      setIsLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        const result = surgePricingEngine.calculateSurgePricing(locationId, {
          orderCount: Math.floor(Math.random() * 20), // Simulate current demand
          availableDrivers: Math.floor(Math.random() * 10) + 1, // Simulate available drivers
        });

        if (baseFee) {
          result.originalFee = baseFee;
          result.surgeFee = baseFee * (result.multiplier - 1);
          result.finalFee = baseFee * result.multiplier;
        }

        setPricingResult(result);
        setIsLoading(false);
        onPricingChange?.(result);
      }, 500);
    };

    calculatePricing();

    // Update pricing every 30 seconds
    const interval = setInterval(calculatePricing, 30000);

    return () => clearInterval(interval);
  }, [locationId, baseFee, onPricingChange]);

  if (isLoading) {
    return (
      <GlassPanel className={`p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-300">
            {t('loading')}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (!pricingResult) {
    return null;
  }

  const getIcon = () => {
    if (!pricingResult.isActive) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    }
    
    if (pricingResult.multiplier >= 2.0) {
      return <ArrowTrendingUpIcon className="w-5 h-5 text-red-600" />;
    }
    
    return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
  };

  const getBackgroundColor = () => {
    if (!pricingResult.isActive) return 'bg-green-50 dark:bg-green-900/20';
    if (pricingResult.multiplier >= 2.0) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-yellow-50 dark:bg-yellow-900/20';
  };

  return (
    <GlassPanel className={`${className}`}>
      <div className={`p-4 rounded-lg ${getBackgroundColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {pricingResult.isActive ? t('surge_pricing') : 'Standard Pricing'}
            </h3>
          </div>
          
          {pricingResult.isActive && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSurgeColor(pricingResult.multiplier)} bg-white/80`}>
              {(pricingResult.multiplier * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Pricing Display */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t('delivery_fee')}
            </span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              {formatCurrency(pricingResult.finalFee)}
            </span>
          </div>
          
          {pricingResult.isActive && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Base fee
              </span>
              <span className="line-through text-gray-500">
                {formatCurrency(pricingResult.originalFee)}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Reason */}
            {pricingResult.isActive && (
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('high_demand')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {pricingResult.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Wait Time */}
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Estimated wait time
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {pricingResult.estimatedWaitTime} minutes
                </p>
              </div>
            </div>

            {/* Surge Info */}
            {pricingResult.isActive && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  💡 Tip: Order now to lock in current pricing or wait for surge to end
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

// Hook for surge pricing
export function useSurgePricing(locationId: string, baseFee?: number) {
  const [pricingResult, setPricingResult] = useState<SurgePricingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculatePricing = () => {
      setIsLoading(true);
      
      const result = surgePricingEngine.calculateSurgePricing(locationId);
      
      if (baseFee) {
        result.originalFee = baseFee;
        result.surgeFee = baseFee * (result.multiplier - 1);
        result.finalFee = baseFee * result.multiplier;
      }

      setPricingResult(result);
      setIsLoading(false);
    };

    calculatePricing();
    const interval = setInterval(calculatePricing, 30000);

    return () => clearInterval(interval);
  }, [locationId, baseFee]);

  return { pricingResult, isLoading };
}
