import { NextResponse } from 'next/server';
import { confirmPayment } from '@/lib/payment-gateway';
import { getSessionUser } from '@/lib/auth';

/**
 * POST /api/payments/confirm
 * Confirm a pending payment
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const result = await confirmPayment(transactionId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
