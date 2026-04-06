'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchMerchantResults } from './search-results';
import { SearchFilters } from './search-filters';
import { getAllMerchants, searchMerchants, type MerchantSearchParams, type MerchantSearchResult } from '@/lib/merchant-search';

export default function MerchantsPage() {
  const searchParams = useSearchParams();
  const [merchants, setMerchants] = useState<MerchantSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MerchantSearchParams>({
    search: searchParams.get('q') || '',
    sortBy: 'rating',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    fetchMerchants();
  }, [filters]);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      if (filters.search || filters.cuisineTags?.length || filters.minRating || filters.isOpen) {
        const result = await searchMerchants(filters);
        setMerchants(result.merchants);
      } else {
        const allMerchants = await getAllMerchants();
        setMerchants(allMerchants);
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<MerchantSearchParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">التجار والمطاعم</h1>
          <p className="text-[#6b5c55]">اكتشف أفضل المطاعم والمطابخ nearك</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <SearchMerchantResults
              merchants={merchants}
              loading={loading}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
