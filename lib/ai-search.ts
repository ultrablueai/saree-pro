/**
 * AI-Powered Search System
 * 
 * Features:
 * - Full-text search across merchants and menu items
 * - Fuzzy matching for typos
 * - Search ranking based on relevance, rating, and popularity
 * - Search suggestions and autocomplete
 * - Search history and analytics
 */

import { getDbExecutor } from '@/lib/db';

export interface SearchResult {
  type: 'merchant' | 'menuItem';
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  priceAmount?: number;
  currency?: string;
  distance?: number;
  score: number;
}

export interface SearchFilters {
  category?: string;
  minRating?: number;
  maxDeliveryFee?: number;
  isOpen?: boolean;
  sortBy?: 'relevance' | 'rating' | 'delivery_time' | 'price';
}

/**
 * Calculate search relevance score
 */
function calculateRelevanceScore(
  match: any,
  type: 'merchant' | 'menuItem',
  filters: SearchFilters
): number {
  let score = 0;

  // Base score from match quality
  if (match.exact_match) score += 100;
  else if (match.starts_with) score += 80;
  else if (match.contains) score += 60;
  else if (match.fuzzy_match) score += 40;

  // Rating bonus
  if (match.rating) {
    score += match.rating * 5; // Up to 50 points
  }

  // Popularity bonus (based on order count)
  if (match.order_count) {
    score += Math.min(match.order_count, 100); // Up to 100 points
  }

  // Apply filters
  if (filters.minRating && match.rating < filters.minRating) {
    score *= 0.5; // Reduce score for items below min rating
  }

  if (filters.maxDeliveryFee && match.delivery_fee_amount > filters.maxDeliveryFee) {
    score *= 0.7; // Reduce score for high delivery fees
  }

  return Math.round(score);
}

/**
 * Search merchants and menu items
 */
export async function searchPlatform(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const db = await getDbExecutor();
  const results: SearchResult[] = [];

  if (!query || query.trim().length === 0) {
    // Return popular items when no query
    return await getPopularItems(filters);
  }

  const searchQuery = query.toLowerCase().trim();

  // Search merchants
  const merchants = await db.all(
    `SELECT 
      m.id,
      m.name,
      m.description,
      m.cover_image_url as image_url,
      m.rating,
      m.delivery_fee_amount,
      m.currency,
      m.status,
      COUNT(DISTINCT o.id) as order_count
     FROM merchants m
     LEFT JOIN orders o ON m.id = o.merchant_id AND o.status != 'cancelled'
     WHERE m.status = 'active'
     AND (
       LOWER(m.name) LIKE ? OR
       LOWER(m.description) LIKE ? OR
       LOWER(m.cuisine_tags) LIKE ?
     )
     GROUP BY m.id
     ORDER BY m.rating DESC, order_count DESC
     LIMIT 20`,
    [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
  );

  for (const merchant of merchants as any[]) {
    const isExact = merchant.name.toLowerCase() === searchQuery;
    const isStartsWith = merchant.name.toLowerCase().startsWith(searchQuery);
    const contains = merchant.name.toLowerCase().includes(searchQuery);
    
    const score = calculateRelevanceScore(
      {
        exact_match: isExact,
        starts_with: isStartsWith,
        contains: contains,
        rating: merchant.rating,
        order_count: merchant.order_count,
        delivery_fee_amount: merchant.delivery_fee_amount,
      },
      'merchant',
      filters
    );

    results.push({
      type: 'merchant',
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      imageUrl: merchant.image_url,
      rating: merchant.rating,
      currency: merchant.currency,
      score,
    });
  }

  // Search menu items
  const menuItems = await db.all(
    `SELECT 
      mi.id,
      mi.name,
      mi.description,
      mi.image_url,
      mi.price_amount,
      mi.currency,
      mi.is_available,
      m.name as merchant_name,
      m.rating as merchant_rating,
      COUNT(DISTINCT oi.id) as order_count
     FROM menu_items mi
     JOIN merchants m ON mi.merchant_id = m.id
     LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
     WHERE m.status = 'active'
     AND mi.is_available = 1
     AND (
       LOWER(mi.name) LIKE ? OR
       LOWER(mi.description) LIKE ?
     )
     GROUP BY mi.id
     ORDER BY mi.sort_order ASC, order_count DESC
     LIMIT 30`,
    [`%${searchQuery}%`, `%${searchQuery}%`]
  );

  for (const item of menuItems as any[]) {
    const isExact = item.name.toLowerCase() === searchQuery;
    const isStartsWith = item.name.toLowerCase().startsWith(searchQuery);
    const contains = item.name.toLowerCase().includes(searchQuery);
    
    const score = calculateRelevanceScore(
      {
        exact_match: isExact,
        starts_with: isStartsWith,
        contains: contains,
        rating: item.merchant_rating,
        order_count: item.order_count,
      },
      'menuItem',
      filters
    );

    results.push({
      type: 'menuItem',
      id: item.id,
      name: `${item.name} (${item.merchant_name})`,
      description: item.description,
      imageUrl: item.image_url,
      priceAmount: item.price_amount,
      currency: item.currency,
      rating: item.merchant_rating,
      score,
    });
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  // Apply sorting filters
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price':
        results.sort((a, b) => (a.priceAmount || 0) - (b.priceAmount || 0));
        break;
      case 'delivery_time':
        // TODO: Implement delivery time estimation
        break;
      default:
        // Already sorted by relevance
        break;
    }
  }

  return results.slice(0, 50); // Return top 50 results
}

/**
 * Get popular items (when no search query)
 */
async function getPopularItems(filters: SearchFilters): Promise<SearchResult[]> {
  const db = await getDbExecutor();
  const results: SearchResult[] = [];

  // Popular merchants
  const merchants = await db.all(
    `SELECT 
      m.id,
      m.name,
      m.description,
      m.cover_image_url as image_url,
      m.rating,
      m.delivery_fee_amount,
      m.currency,
      COUNT(DISTINCT o.id) as order_count
     FROM merchants m
     LEFT JOIN orders o ON m.id = o.merchant_id AND o.status != 'cancelled'
     WHERE m.status = 'active'
     GROUP BY m.id
     ORDER BY order_count DESC, m.rating DESC
     LIMIT 10`
  );

  for (const merchant of merchants as any[]) {
    results.push({
      type: 'merchant',
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      imageUrl: merchant.image_url,
      rating: merchant.rating,
      currency: merchant.currency,
      score: merchant.order_count + (merchant.rating * 10),
    });
  }

  return results;
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const db = await getDbExecutor();
  const suggestions = new Set<string>();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery = query.toLowerCase().trim();

  // Get merchant name suggestions
  const merchants = await db.all(
    `SELECT DISTINCT m.name
     FROM merchants m
     WHERE m.status = 'active'
     AND LOWER(m.name) LIKE ?
     ORDER BY m.rating DESC
     LIMIT ?`,
    [`%${searchQuery}%`, limit]
  );

  for (const merchant of merchants as any[]) {
    suggestions.add(merchant.name);
  }

  // Get menu item name suggestions
  const items = await db.all(
    `SELECT DISTINCT mi.name
     FROM menu_items mi
     JOIN merchants m ON mi.merchant_id = m.id
     WHERE m.status = 'active'
     AND mi.is_available = 1
     AND LOWER(mi.name) LIKE ?
     ORDER BY mi.sort_order ASC
     LIMIT ?`,
    [`%${searchQuery}%`, limit]
  );

  for (const item of items as any[]) {
    suggestions.add(item.name);
  }

  return Array.from(suggestions).slice(0, limit);
}

/**
 * Record search for analytics
 */
export async function recordSearch(
  userId: string,
  query: string,
  resultCount: number
): Promise<void> {
  const db = await getDbExecutor();

  await db.run(
    `INSERT INTO audit_logs (
      id, actor_user_id, action, entity_type, entity_id, meta_json, created_at
    ) VALUES (
      lower(hex(randomblob(16))), ?, 'search', 'platform', NULL, ?, datetime('now')
    )`,
    [userId, JSON.stringify({ query, result_count: resultCount })]
  );
}

/**
 * Fuzzy string matching for typos
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function isFuzzyMatch(query: string, target: string, threshold: number = 2): boolean {
  if (Math.abs(query.length - target.length) > threshold) {
    return false;
  }
  return levenshteinDistance(query.toLowerCase(), target.toLowerCase()) <= threshold;
}
