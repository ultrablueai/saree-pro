import { NextResponse } from "next/server";
import { getLiveSurgePricing } from "@/lib/surge-pricing-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await params;
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId") ?? undefined;
    const weather = searchParams.get("weather") ?? undefined;
    const baseFeeParam = searchParams.get("baseFee");
    const parsedBaseFee = baseFeeParam ? Number(baseFeeParam) : undefined;
    const baseDeliveryFee =
      parsedBaseFee !== undefined && Number.isFinite(parsedBaseFee) && parsedBaseFee > 0
        ? parsedBaseFee
        : undefined;

    const snapshot = await getLiveSurgePricing({
      locationId,
      merchantId,
      weather,
      baseDeliveryFee,
    });

    return NextResponse.json({
      data: snapshot.pricing,
      pricing: snapshot.pricing,
      factors: snapshot.factors,
      refreshedAt: snapshot.refreshedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to calculate surge pricing",
      },
      { status: 500 },
    );
  }
}
