import { NextResponse } from 'next/server';
import {
  createPaymentIntent,
  getPaymentHistory,
  type PaymentIntent,
} from '@/lib/payment-gateway';
import { getSessionUser } from '@/lib/auth';

interface CreatePaymentRequestBody {
  orderId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentIntent['paymentMethod'];
  metadata?: Record<string, unknown>;
}

/**
 * POST /api/payments/create
 * Create a new payment intent
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreatePaymentRequestBody;
    const { orderId, amount, currency, paymentMethod, metadata } = body;

    if (!orderId || typeof amount !== 'number' || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createPaymentIntent({
      orderId,
      amount,
      currency: currency || 'SAR',
      paymentMethod,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: result.status === 'failed' ? 400 : 200 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/:orderId/history
 * Get payment history for an order
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const orderId = url.pathname.split('/').pop();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      );
    }

    const transactions = await getPaymentHistory(orderId);

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error('Payment history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
