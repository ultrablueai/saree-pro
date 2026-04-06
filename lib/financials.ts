import { randomUUID } from "node:crypto";
import { getDbExecutor, type DbExecutor } from "@/lib/db";

export const PLATFORM_FEE_RATE = 0.12;

export interface SettlementBreakdown {
  platformFeeAmount: number;
  merchantPayoutAmount: number;
  driverPayoutAmount: number;
  totalSettledAmount: number;
}

export function calculateSettlementBreakdown(
  subtotalAmount: number,
  deliveryFeeAmount: number,
): SettlementBreakdown {
  const platformFeeAmount = Math.round(subtotalAmount * PLATFORM_FEE_RATE);
  const merchantPayoutAmount = Math.max(0, subtotalAmount - platformFeeAmount);
  const driverPayoutAmount = deliveryFeeAmount;

  return {
    platformFeeAmount,
    merchantPayoutAmount,
    driverPayoutAmount,
    totalSettledAmount: merchantPayoutAmount + driverPayoutAmount + platformFeeAmount,
  };
}

interface FinancialLedgerEntryInput {
  orderId: string;
  entryType:
    | "escrow_hold"
    | "escrow_release"
    | "platform_fee"
    | "merchant_payout"
    | "driver_payout"
    | "refund";
  partyType: "customer" | "merchant" | "driver" | "platform";
  partyId?: string | null;
  amount: number;
  currency: string;
  note?: string | null;
}

export async function insertFinancialLedgerEntry(
  input: FinancialLedgerEntryInput,
  executor?: DbExecutor,
) {
  const db = executor ?? (await getDbExecutor());
  await db.run(
    `INSERT INTO financial_ledger_entries (
      id, order_id, entry_type, party_type, party_id, amount, currency, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      randomUUID(),
      input.orderId,
      input.entryType,
      input.partyType,
      input.partyId ?? null,
      input.amount,
      input.currency,
      input.note ?? null,
    ],
  );
}
