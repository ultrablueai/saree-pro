import { NextResponse } from "next/server";
import { runSmartCatalogSearch } from "@/lib/ai-search-server";

export const dynamic = "force-dynamic";

function parsePriceRange(searchParams: URLSearchParams) {
  const minPrice = Number(searchParams.get("minPrice") ?? "");
  const maxPrice = Number(searchParams.get("maxPrice") ?? "");
  const hasMin = Number.isFinite(minPrice);
  const hasMax = Number.isFinite(maxPrice);

  if (!hasMin && !hasMax) {
    return undefined;
  }

  return [hasMin ? minPrice : 0, hasMax ? maxPrice : 9999] as [number, number];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const cuisine = searchParams.get("cuisine")?.trim() ?? "";
    const location = searchParams.get("location")?.trim() ?? "";
    const dietary = searchParams.getAll("dietary").map((value) => value.trim()).filter(Boolean);

    const search = await runSmartCatalogSearch(query, {
      cuisine: cuisine || undefined,
      priceRange: parsePriceRange(searchParams),
      location: location || undefined,
      dietary,
    });

    return NextResponse.json({
      data: search,
      search,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Smart search failed",
      },
      { status: 500 },
    );
  }
}
