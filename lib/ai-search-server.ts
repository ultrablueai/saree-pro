import { getDbExecutor } from "@/lib/db";
import { searchMerchants } from "@/lib/merchant-search";

export interface SmartSearchFilters {
  cuisine?: string;
  priceRange?: [number, number];
  location?: string;
  dietary?: string[];
}

export interface SmartSearchItem {
  id: string;
  type: "menu_item" | "merchant" | "category";
  title: string;
  description: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export interface SmartSearchResult {
  query: string;
  results: SmartSearchItem[];
  suggestions: string[];
  correctedQuery?: string;
}

interface MenuItemSearchRow {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  cuisineTags: string;
  categoryId: string | null;
  categoryName: string;
  isAvailable: number | boolean;
}

interface CategorySearchRow {
  id: string;
  name: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  merchantDescription: string;
  cuisineTags: string;
  itemCount: number;
}

const QUERY_CORRECTIONS: Record<string, string> = {
  kabsaa: "kabsa",
  kabsah: "kabsa",
  lentill: "lentil",
  resturant: "restaurant",
  restraunt: "restaurant",
  shawerma: "shawarma",
};

const DEFAULT_SUGGESTIONS = [
  "Kabsa",
  "Grills",
  "Soup",
  "Saudi kitchen",
  "Best Sellers",
];

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function scoreTextMatch(query: string, text: string, weights: {
  exact: number;
  prefix: number;
  includes: number;
  token: number;
}) {
  const normalizedText = normalizeSearchTerm(text);
  if (!normalizedText) {
    return 0;
  }

  if (normalizedText === query) {
    return weights.exact;
  }

  if (normalizedText.startsWith(query)) {
    return weights.prefix;
  }

  if (normalizedText.includes(query)) {
    return weights.includes;
  }

  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => normalizedText.includes(token))) {
    return weights.token;
  }

  return 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

function getCorrectedQuery(query: string) {
  return QUERY_CORRECTIONS[query];
}

async function searchMenuItems(query: string, filters: SmartSearchFilters) {
  const db = await getDbExecutor();
  const params: Array<string | number> = [
    `%${query}%`,
    `%${query}%`,
    `%${query}%`,
    `%${query}%`,
  ];

  let sql = `
    SELECT
      mi.id,
      mi.name,
      mi.description,
      mi.price_amount as priceAmount,
      mi.currency,
      mi.merchant_id as merchantId,
      m.name as merchantName,
      m.slug as merchantSlug,
      m.cuisine_tags as cuisineTags,
      mi.category_id as categoryId,
      COALESCE(c.name, 'Uncategorized') as categoryName,
      mi.is_available as isAvailable
    FROM menu_items mi
    INNER JOIN merchants m ON m.id = mi.merchant_id
    LEFT JOIN menu_categories c ON c.id = mi.category_id
    WHERE m.status = 'active'
      AND mi.is_available = 1
      AND (
        lower(mi.name) LIKE lower(?)
        OR lower(mi.description) LIKE lower(?)
        OR lower(COALESCE(c.name, '')) LIKE lower(?)
        OR lower(m.name) LIKE lower(?)
      )
  `;

  if (filters.cuisine) {
    sql += " AND lower(m.cuisine_tags) LIKE lower(?)";
    params.push(`%${filters.cuisine}%`);
  }

  const minPrice = filters.priceRange?.[0];
  const maxPrice = filters.priceRange?.[1];
  if (typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0) {
    sql += " AND mi.price_amount >= ?";
    params.push(Math.round(minPrice * 100));
  }

  if (typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice > 0) {
    sql += " AND mi.price_amount <= ?";
    params.push(Math.round(maxPrice * 100));
  }

  sql += " ORDER BY mi.sort_order ASC, mi.name ASC LIMIT 8";

  return db.all<MenuItemSearchRow>(sql, params);
}

async function searchCategories(query: string, filters: SmartSearchFilters) {
  const db = await getDbExecutor();
  const params: Array<string | number> = [`%${query}%`, `%${query}%`];

  let sql = `
    SELECT
      c.id,
      c.name,
      c.merchant_id as merchantId,
      m.name as merchantName,
      m.slug as merchantSlug,
      m.description as merchantDescription,
      m.cuisine_tags as cuisineTags,
      COUNT(mi.id) as itemCount
    FROM menu_categories c
    INNER JOIN merchants m ON m.id = c.merchant_id
    LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.is_available = 1
    WHERE m.status = 'active'
      AND (
        lower(c.name) LIKE lower(?)
        OR lower(m.name) LIKE lower(?)
      )
  `;

  if (filters.cuisine) {
    sql += " AND lower(m.cuisine_tags) LIKE lower(?)";
    params.push(`%${filters.cuisine}%`);
  }

  sql += `
    GROUP BY c.id, c.name, c.merchant_id, m.name, m.slug, m.description, m.cuisine_tags
    ORDER BY c.sort_order ASC, c.name ASC
    LIMIT 6
  `;

  return db.all<CategorySearchRow>(sql, params);
}

function buildSuggestions(
  query: string,
  correctedQuery: string | undefined,
  results: SmartSearchItem[],
) {
  const suggestions = new Set<string>();

  if (correctedQuery && correctedQuery !== query) {
    suggestions.add(correctedQuery);
  }

  for (const result of results) {
    if (suggestions.size >= 6) {
      break;
    }

    suggestions.add(result.title);

    const cuisineTags = Array.isArray(result.metadata?.cuisineTags)
      ? (result.metadata?.cuisineTags as string[])
      : [];
    for (const tag of cuisineTags) {
      if (suggestions.size >= 6) {
        break;
      }
      suggestions.add(tag);
    }

    const categoryName =
      typeof result.metadata?.categoryName === "string"
        ? result.metadata.categoryName
        : null;
    if (categoryName && suggestions.size < 6) {
      suggestions.add(categoryName);
    }
  }

  for (const value of DEFAULT_SUGGESTIONS) {
    if (suggestions.size >= 6) {
      break;
    }
    suggestions.add(value);
  }

  return Array.from(suggestions).filter(
    (suggestion) => normalizeSearchTerm(suggestion) !== query,
  );
}

export async function runSmartCatalogSearch(
  query: string,
  filters: SmartSearchFilters = {},
): Promise<SmartSearchResult> {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return {
      query: "",
      results: [],
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const correctedQuery = getCorrectedQuery(normalizedQuery);
  const effectiveQuery = correctedQuery ?? normalizedQuery;

  const [merchantMatches, menuItemRows, categoryRows] = await Promise.all([
    searchMerchants({
      search: effectiveQuery,
      cuisineTags: filters.cuisine ? [filters.cuisine] : [],
      sortBy: "rating",
      sortOrder: "desc",
      limit: 5,
    }),
    searchMenuItems(effectiveQuery, filters),
    searchCategories(effectiveQuery, filters),
  ]);

  const menuItemResults: SmartSearchItem[] = menuItemRows.map((row) => {
    const nameScore = scoreTextMatch(effectiveQuery, row.name, {
      exact: 0.98,
      prefix: 0.92,
      includes: 0.84,
      token: 0.72,
    });
    const descriptionScore = scoreTextMatch(effectiveQuery, row.description, {
      exact: 0.65,
      prefix: 0.58,
      includes: 0.5,
      token: 0.42,
    });
    const categoryScore = scoreTextMatch(effectiveQuery, row.categoryName, {
      exact: 0.66,
      prefix: 0.6,
      includes: 0.54,
      token: 0.48,
    });
    const merchantScore = scoreTextMatch(effectiveQuery, row.merchantName, {
      exact: 0.58,
      prefix: 0.52,
      includes: 0.46,
      token: 0.38,
    });

    const score = clampScore(
      nameScore * 0.56 +
        descriptionScore * 0.16 +
        categoryScore * 0.12 +
        merchantScore * 0.1 +
        (row.isAvailable ? 0.06 : 0),
    );

    return {
      id: row.id,
      type: "menu_item",
      title: row.name,
      description: `${row.description} From ${row.merchantName}. ${formatCurrency(row.priceAmount, row.currency)}`,
      relevanceScore: score,
      metadata: {
        merchantId: row.merchantId,
        merchantName: row.merchantName,
        merchantSlug: row.merchantSlug,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        priceAmount: row.priceAmount,
        currency: row.currency,
        cuisineTags: splitTags(row.cuisineTags),
        href: `/workspace/merchants/${row.merchantSlug}`,
      },
    };
  });

  const merchantResults: SmartSearchItem[] = merchantMatches.merchants.map((merchant) => {
    const nameScore = scoreTextMatch(effectiveQuery, merchant.name, {
      exact: 0.95,
      prefix: 0.88,
      includes: 0.78,
      token: 0.68,
    });
    const descriptionScore = scoreTextMatch(effectiveQuery, merchant.description, {
      exact: 0.58,
      prefix: 0.5,
      includes: 0.44,
      token: 0.36,
    });
    const cuisineScore = merchant.cuisineTags.reduce((highest, tag) => {
      return Math.max(
        highest,
        scoreTextMatch(effectiveQuery, tag, {
          exact: 0.72,
          prefix: 0.64,
          includes: 0.56,
          token: 0.5,
        }),
      );
    }, 0);

    const score = clampScore(
      nameScore * 0.48 +
        descriptionScore * 0.16 +
        cuisineScore * 0.16 +
        Math.min(merchant.rating / 5, 1) * 0.14 +
        (merchant.isOpen ? 0.06 : 0),
    );

    return {
      id: merchant.id,
      type: "merchant",
      title: merchant.name,
      description: `${merchant.description} ${merchant.isOpen ? "Open now" : merchant.nextOpenHour ?? "Currently closed"}`,
      relevanceScore: score,
      metadata: {
        merchantId: merchant.id,
        merchantSlug: merchant.slug,
        rating: merchant.rating,
        cuisineTags: merchant.cuisineTags,
        deliveryFeeAmount: merchant.deliveryFeeAmount,
        minimumOrderAmount: merchant.minimumOrderAmount,
        href: `/workspace/merchants/${merchant.slug}`,
      },
    };
  });

  const categoryResults: SmartSearchItem[] = categoryRows.map((row) => {
    const nameScore = scoreTextMatch(effectiveQuery, row.name, {
      exact: 0.86,
      prefix: 0.8,
      includes: 0.7,
      token: 0.62,
    });
    const merchantScore = scoreTextMatch(effectiveQuery, row.merchantName, {
      exact: 0.56,
      prefix: 0.48,
      includes: 0.4,
      token: 0.34,
    });

    return {
      id: row.id,
      type: "category",
      title: `${row.name} at ${row.merchantName}`,
      description: `${row.itemCount} available items in this category.`,
      relevanceScore: clampScore(nameScore * 0.72 + merchantScore * 0.2 + 0.08),
      metadata: {
        merchantId: row.merchantId,
        merchantSlug: row.merchantSlug,
        merchantName: row.merchantName,
        categoryName: row.name,
        cuisineTags: splitTags(row.cuisineTags),
        href: `/workspace/merchants/${row.merchantSlug}`,
      },
    };
  });

  const results = [...menuItemResults, ...merchantResults, ...categoryResults]
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }
      return left.title.localeCompare(right.title);
    })
    .slice(0, 10);

  return {
    query,
    results,
    suggestions: buildSuggestions(effectiveQuery, correctedQuery, results),
    correctedQuery: correctedQuery && correctedQuery !== normalizedQuery ? correctedQuery : undefined,
  };
}
