'use client';

import { StarIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { MerchantSearchResult } from '@/lib/merchant-search';

interface Props {
  merchants: MerchantSearchResult[];
  loading: boolean;
  onSearch: (query: string) => void;
}

export function SearchMerchantResults({ merchants, loading, onSearch }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن مطعم أو مطبخ..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
            dir="rtl"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-[#6b5c55]">
          تم العثور على {merchants.length} تاجر
        </p>
      </div>

      {/* Merchants List */}
      {merchants.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-500 text-lg">لا توجد نتائج</p>
          <p className="text-gray-400 text-sm mt-2">جرب تغيير معايير البحث</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merchants.map(merchant => (
            <MerchantCard key={merchant.id} merchant={merchant} />
          ))}
        </div>
      )}
    </div>
  );
}

function MerchantCard({ merchant }: { merchant: MerchantSearchResult }) {
  const formatCurrency = (amount: number) => {
    return `${(amount / 100).toFixed(2)} ريال`;
  };

  return (
    <a
      href={`/workspace/merchants/${merchant.slug}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
    >
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="md:w-64 h-48 relative">
          {merchant.coverImageUrl ? (
            <img
              src={merchant.coverImageUrl}
              alt={merchant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#d66b42] to-[#b85a35] flex items-center justify-center">
              <span className="text-white text-6xl">🍽️</span>
            </div>
          )}
          {merchant.isOpen && (
            <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              مفتوح الآن
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-bold text-[#2d1f1a]">{merchant.name}</h3>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                i < Math.floor(merchant.rating) ? (
                  <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
                ) : (
                  <StarIcon key={i} className="w-4 h-4 text-gray-300" />
                )
              ))}
              <span className="text-sm text-gray-600 ml-1">{merchant.rating.toFixed(1)}</span>
            </div>
          </div>

          <p className="text-sm text-[#6b5c55] mb-4 line-clamp-2">{merchant.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {merchant.cuisineTags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-[#f4efe8] text-[#6b5c55] rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-center gap-6 text-sm text-[#6b5c55]">
            <div className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4" />
              <span>رسوم التوصيل: {formatCurrency(merchant.deliveryFeeAmount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>الحد الأدنى: {formatCurrency(merchant.minimumOrderAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
