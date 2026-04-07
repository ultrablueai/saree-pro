import { NextResponse } from "next/server";
import {
  assertWalletAccess,
  getWalletErrorResponse,
  getWalletSummaryByUserId,
} from "@/lib/wallet-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    await assertWalletAccess(userId);
    const wallet = await getWalletSummaryByUserId(userId);

    return NextResponse.json({
      data: wallet,
      wallet,
      userId,
    });
  } catch (error) {
    return getWalletErrorResponse(error);
  }
}
