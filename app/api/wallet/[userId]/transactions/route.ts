import { NextResponse } from "next/server";
import {
  assertWalletAccess,
  getWalletErrorResponse,
  getWalletTransactionsByUserId,
} from "@/lib/wallet-server";

export const dynamic = "force-dynamic";

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    await assertWalletAccess(userId);

    const { searchParams } = new URL(request.url);
    const limit = clampNumber(searchParams.get("limit"), 50, 1, 100);
    const offset = clampNumber(searchParams.get("offset"), 0, 0, 1000);
    const transactions = await getWalletTransactionsByUserId(userId, limit, offset);

    return NextResponse.json({
      data: transactions,
      items: transactions,
      pagination: {
        limit,
        offset,
        count: transactions.length,
      },
      userId,
    });
  } catch (error) {
    return getWalletErrorResponse(error);
  }
}
