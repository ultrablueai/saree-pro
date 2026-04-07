'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { getGeminiAIService, SmartSearchResult } from '../../lib/gemini-ai';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { cn } from '../../lib/utils';

interface SmartSearchProps {
  onResultSelect?: (result: any) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
}

export function SmartSearch({
  onResultSelect,
  placeholder = 'Search for food, restaurants...',
  className = '',
  showFilters = true,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    cuisine: '',
    priceRange: [0, 100] as [number, number],
    location: '',
    dietary: [] as string[],
  });
  
  const { t } = useLocalization();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setShowResults(true);

    try {
      const aiService = getGeminiAIService();
      const searchResults = await aiService.smartSearch(searchQuery, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Smart search failed:', error);
      // Fallback to basic search
      setResults({
        query: searchQuery,
        results: [],
        suggestions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: any) => {
    onResultSelect?.(result);
    setShowResults(false);
    setQuery('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <GlassPanel className="flex items-center px-4 py-3">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 mr-3" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </GlassPanel>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <GlassPanel className="mt-2 p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={filters.cuisine}
              onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Cuisines</option>
              <option value="turkish">Turkish</option>
              <option value="arabic">Arabic</option>
              <option value="italian">Italian</option>
              <option value="chinese">Chinese</option>
              <option value="indian">Indian</option>
              <option value="american">American</option>
            </select>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">$</span>
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange[0]}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]] 
                })}
                className="w-20 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  priceRange: [filters.priceRange[0], parseInt(e.target.value) || 100] 
                })}
                className="w-20 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />

            <select
              multiple
              value={filters.dietary}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ ...filters, dietary: values });
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </select>
          </div>
        </GlassPanel>
      )}

      {/* Search Results */}
      {showResults && results && (
        <GlassPanel className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          {/* Corrected Query */}
          {results.correctedQuery && results.correctedQuery !== query && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Did you mean: 
                <button
                  onClick={() => handleSuggestionClick(results.correctedQuery!)}
                  className="ml-1 font-medium underline"
                >
                  {results.correctedQuery}
                </button>
              </p>
            </div>
          )}

          {/* Search Results */}
          {results.results.length > 0 ? (
            <div className="p-2">
              {results.results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {result.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {result.description}
                      </p>
                      <div className="flex items-center mt-2 space-x-3">
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                          {result.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(result.relevanceScore * 100)}% match
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No results found for "{results.query}"
              </p>
            </div>
          )}

          {/* Suggestions */}
          {results.suggestions.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggestions:
              </p>
              <div className="flex flex-wrap gap-2">
                {results.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-sm px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
