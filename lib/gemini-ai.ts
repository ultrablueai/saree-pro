import type {
  SmartSearchFilters,
  SmartSearchResult,
} from "@/lib/ai-search-server";

export type { SmartSearchFilters, SmartSearchResult } from "@/lib/ai-search-server";

async function parseSearchResponse(response: Response, fallbackQuery: string) {
  if (!response.ok) {
    throw new Error(`Smart search request failed with ${response.status}`);
  }

  const payload = (await response.json()) as
    | { data?: SmartSearchResult; search?: SmartSearchResult }
    | SmartSearchResult;

  if ("results" in payload && Array.isArray(payload.results)) {
    return payload;
  }

  if ("data" in payload || "search" in payload) {
    const result = payload.data ?? payload.search;
    if (result) {
      return result;
    }
  }

  return {
    query: fallbackQuery,
    results: [],
    suggestions: [],
  } satisfies SmartSearchResult;
}

export class GeminiAIService {
  async smartSearch(
    query: string,
    filters: SmartSearchFilters = {},
  ): Promise<SmartSearchResult> {
    const searchParams = new URLSearchParams({ query });

    if (filters.cuisine) {
      searchParams.set("cuisine", filters.cuisine);
    }

    const minPrice = filters.priceRange?.[0];
    const maxPrice = filters.priceRange?.[1];
    if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
      searchParams.set("minPrice", String(minPrice));
    }
    if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
      searchParams.set("maxPrice", String(maxPrice));
    }
    if (filters.location) {
      searchParams.set("location", filters.location);
    }
    for (const dietary of filters.dietary ?? []) {
      searchParams.append("dietary", dietary);
    }

    const response = await fetch(`/api/ai/search?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    return parseSearchResponse(response, query);
  }
}

let geminiAIService: GeminiAIService | null = null;

export function getGeminiAIService() {
  if (!geminiAIService) {
    geminiAIService = new GeminiAIService();
  }

  return geminiAIService;
}
