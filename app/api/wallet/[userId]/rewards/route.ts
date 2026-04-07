import { NextResponse } from "next/server";
import {
  assertWalletAccess,
  getWalletErrorResponse,
  getWalletRewardsByUserId,
} from "@/lib/wallet-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    await assertWalletAccess(userId);
    const rewards = await getWalletRewardsByUserId(userId);

    return NextResponse.json({
      data: rewards,
      items: rewards,
      rewards,
      userId,
    });
  } catch (error) {
    return getWalletErrorResponse(error);
  }
}
