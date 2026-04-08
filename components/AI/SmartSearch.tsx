'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getGeminiAIService, type SmartSearchFilters, type SmartSearchResult } from '../../lib/gemini-ai';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { cn } from '../../lib/utils';

interface SmartSearchProps {
  onResultSelect?: (result: SmartSearchResult['results'][number]) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
}

function getResultTypeLabel(type: SmartSearchResult['results'][number]['type']) {
  if (type === 'menu_item') {
    return 'Menu item';
  }

  if (type === 'merchant') {
    return 'Merchant';
  }

  return 'Category';
}

function getPriceRangeValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function SmartSearch({
  onResultSelect,
  placeholder = 'Search dishes, merchants, and categories...',
  className = '',
  showFilters = true,
}: SmartSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState<SmartSearchFilters>({
    cuisine: '',
    priceRange: [0, 100],
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults(null);
        setShowResults(false);
        setIsLoading(false);
        return;
      }

      void performSearch(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function performSearch(searchQuery: string) {
    setIsLoading(true);
    setShowResults(true);

    try {
      const aiService = getGeminiAIService();
      const searchResults = await aiService.smartSearch(searchQuery, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Smart search failed:', error);
      setResults({
        query: searchQuery,
        results: [],
        suggestions: [],
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleResultClick(result: SmartSearchResult['results'][number]) {
    onResultSelect?.(result);

    const href =
      typeof result.metadata?.href === 'string' ? result.metadata.href : null;
    if (!onResultSelect && href) {
      router.push(href);
    }

    setShowResults(false);
    setQuery('');
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion);
    inputRef.current?.focus();
  }

  function clearSearch() {
    setQuery('');
    setResults(null);
    setShowResults(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={searchRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <GlassPanel className="flex items-center px-4 py-3">
          <MagnifyingGlassIcon className="mr-3 h-5 w-5 text-gray-400" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-gray-900 outline-none placeholder-gray-400 dark:text-white"
          />

          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Clear smart search"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </GlassPanel>

        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 transform">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : null}
      </div>

      {showFilters ? (
        <GlassPanel className="mt-2 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_0.8fr_0.8fr]">
            <select
              value={filters.cuisine ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  cuisine: event.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All cuisines</option>
              <option value="saudi">Saudi</option>
              <option value="arabic">Arabic</option>
              <option value="grills">Grills</option>
              <option value="bowls">Bowls</option>
              <option value="desserts">Desserts</option>
            </select>

            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={filters.priceRange?.[0] ?? 0}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priceRange: [
                    getPriceRangeValue(event.target.value, 0),
                    current.priceRange?.[1] ?? 100,
                  ],
                }))
              }
              placeholder="Min price"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={filters.priceRange?.[1] ?? 100}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priceRange: [
                    current.priceRange?.[0] ?? 0,
                    getPriceRangeValue(event.target.value, 100),
                  ],
                }))
              }
              placeholder="Max price"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Smart search now runs against the live merchants, categories, and menu items in your database.
          </p>
        </GlassPanel>
      ) : null}

      {showResults && results ? (
        <GlassPanel className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto">
          {results.correctedQuery && results.correctedQuery !== query ? (
            <div className="border-b border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Did you mean{' '}
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(results.correctedQuery!)}
                  className="font-medium underline"
                >
                  {results.correctedQuery}
                </button>
                ?
              </p>
            </div>
          ) : null}

          {results.results.length > 0 ? (
            <div className="p-2">
              {results.results.map((result) => {
                const merchantName =
                  typeof result.metadata?.merchantName === 'string'
                    ? result.metadata.merchantName
                    : null;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {result.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                            {getResultTypeLabel(result.type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(result.relevanceScore * 100)}% match
                          </span>
                          {merchantName && result.type !== 'merchant' ? (
                            <span className="text-xs text-gray-500">
                              {merchantName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No live results found for &quot;{results.query}&quot;.
              </p>
            </div>
          )}

          {results.suggestions.length > 0 ? (
            <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Try these:
              </p>
              <div className="flex flex-wrap gap-2">
                {results.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </GlassPanel>
      ) : null}
    </div>
  );
}
