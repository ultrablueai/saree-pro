import { NextResponse } from 'next/server';
import { refundPayment } from '@/lib/payment-gateway';
import { getSessionUser } from '@/lib/auth';

/**
 * POST /api/payments/refund
 * Refund a completed payment
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or owner role
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin or owner role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { transactionId, reason } = body;

    if (!transactionId || !reason) {
      return NextResponse.json(
        { error: 'Transaction ID and reason required' },
        { status: 400 }
      );
    }

    const result = await refundPayment(transactionId, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Payment refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
