import { GET as getWallet } from "@/app/api/wallet/[userId]/route";

export const dynamic = "force-dynamic";
export const GET = getWallet;
