import { NextResponse } from "next/server";
import {
  assertWalletAccess,
  getLoyaltyPointsByUserId,
  getWalletErrorResponse,
} from "@/lib/wallet-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    await assertWalletAccess(userId);
    const loyalty = await getLoyaltyPointsByUserId(userId);

    return NextResponse.json({
      data: loyalty,
      loyalty,
      loyaltyPoints: loyalty,
      userId,
    });
  } catch (error) {
    return getWalletErrorResponse(error);
  }
}
