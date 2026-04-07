'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import type { MerchantSearchParams } from '@/lib/merchant-search';

interface Props {
  filters: MerchantSearchParams;
  onFilterChange: (filters: Partial<MerchantSearchParams>) => void;
}

export function SearchFilters({ filters, onFilterChange }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const cuisineOptions = [
    { value: 'saudi', label: 'سعودي' },
    { value: 'arabic', label: 'عربي' },
    { value: 'indian', label: 'هندي' },
    { value: 'grills', label: 'مشاوي' },
    { value: 'bowls', label: 'أطباق' },
    { value: 'fast-food', label: 'وجبات سريعة' },
    { value: 'desserts', label: 'حلويات' },
  ];

  const toggleCuisine = (tag: string) => {
    const currentTags = filters.cuisineTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    onFilterChange({ cuisineTags: newTags });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 border-b border-gray-100"
      >
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-[#6b5c55]" />
          <h3 className="font-semibold text-[#2d1f1a]">التصفية</h3>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-6">
          {/* Open Status */}
          <div>
            <h4 className="text-sm font-medium text-[#2d1f1a] mb-2">حالة المتجر</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isOpen === true}
                onChange={(e) => onFilterChange({ isOpen: e.target.checked || undefined })}
                className="rounded border-gray-300 text-[#d66b42] focus:ring-[#d66b42]"
              />
              <span className="text-sm text-[#6b5c55]">مفتوح الآن</span>
            </label>
          </div>

          {/* Cuisine Tags */}
          <div>
            <h4 className="text-sm font-medium text-[#2d1f1a] mb-2">نوع المطبخ</h4>
            <div className="space-y-2">
              {cuisineOptions.map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(filters.cuisineTags || []).includes(option.value)}
                    onChange={() => toggleCuisine(option.value)}
                    className="rounded border-gray-300 text-[#d66b42] focus:ring-[#d66b42]"
                  />
                  <span className="text-sm text-[#6b5c55]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Minimum Rating */}
          <div>
            <h4 className="text-sm font-medium text-[#2d1f1a] mb-2">الحد الأدنى للتقييم</h4>
            <select
              value={filters.minRating || 0}
              onChange={(e) => onFilterChange({ minRating: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] text-sm"
            >
              <option value={0}>الكل</option>
              <option value={3}>3+ نجوم</option>
              <option value={4}>4+ نجوم</option>
              <option value={4.5}>4.5+ نجوم</option>
            </select>
          </div>

          {/* Max Delivery Fee */}
          <div>
            <h4 className="text-sm font-medium text-[#2d1f1a] mb-2">الحد الأقصى لرسوم التوصيل</h4>
            <input
              type="range"
              min="0"
              max="5000"
              step="500"
              value={filters.maxDeliveryFee || 5000}
              onChange={(e) => onFilterChange({ maxDeliveryFee: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-[#6b5c55] mt-1">
              <span>0 ريال</span>
              <span>{((filters.maxDeliveryFee || 5000) / 100).toFixed(2)} ريال</span>
              <span>50 ريال</span>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h4 className="text-sm font-medium text-[#2d1f1a] mb-2">ترتيب حسب</h4>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split("-");
                onFilterChange({
                  sortBy: sortBy as NonNullable<MerchantSearchParams["sortBy"]>,
                  sortOrder: sortOrder as NonNullable<MerchantSearchParams["sortOrder"]>,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] text-sm"
            >
              <option value="rating-desc">التقييم: الأعلى أولاً</option>
              <option value="rating-asc">التقييم: الأقل أولاً</option>
              <option value="deliveryFee-asc">رسوم التوصيل: الأقل أولاً</option>
              <option value="deliveryFee-desc">رسوم التوصيل: الأعلى أولاً</option>
              <option value="name-asc">الاسم: أ - ي</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => onFilterChange({
              search: '',
              cuisineTags: [],
              minRating: 0,
              maxDeliveryFee: undefined,
              isOpen: undefined,
              sortBy: 'rating',
              sortOrder: 'desc',
            })}
            className="w-full py-2 text-sm text-[#d66b42] hover:text-[#b85a35] font-medium"
          >
            إعادة تعيين التصفية
          </button>
        </div>
      )}
    </div>
  );
}
