import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';
import { createOrder } from './actions';
import { redirect } from 'next/navigation';

export default async function CheckoutPage() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Get cart items
  const cartItems = await db.all(
    `SELECT sc.*, mi.name as item_name, mi.price_amount, mi.currency,
            m.name as merchant_name, m.delivery_fee_amount, m.minimum_order_amount
     FROM shopping_carts sc
     JOIN menu_items mi ON sc.menu_item_id = mi.id
     JOIN merchants m ON sc.merchant_id = m.id
     WHERE sc.user_id = ?`,
    [session.id]
  ) as any[];

  if (!cartItems || cartItems.length === 0) {
    redirect('/workspace/cart');
  }

  // Get user addresses
  const addresses = await db.all(
    `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
    [session.id]
  ) as any[];

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price_amount * item.quantity), 0);
  const deliveryFee = cartItems[0]?.delivery_fee_amount || 0;
  const minimumOrder = cartItems[0]?.minimum_order_amount || 0;
  const total = subtotal + deliveryFee;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-8 text-3xl font-semibold text-[var(--color-ink)]">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Checkout Form */}
        <div className="space-y-6">
          {/* Delivery Address */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Delivery Address</h2>
            
            {addresses && addresses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-4 transition hover:border-[var(--color-accent)] has-[:checked]:border-[var(--color-accent)] has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name="addressId"
                      value={address.id}
                      defaultChecked={address.is_default}
                      className="mt-1"
                      required
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {address.label || 'Address'}
                        </span>
                        {address.is_default && (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {address.street}, {address.building}
                        {address.floor ? `, Floor ${address.floor}` : ''}
                        {address.apartment ? `, Apt ${address.apartment}` : ''}
                      </p>
                      <p className="text-sm text-[var(--color-muted)]">
                        {address.district && `${address.district}, `}{address.city}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-700">
                  No addresses saved. Please add a delivery address first.
                </p>
                <a href="/workspace/addresses" className="mt-3 inline-block">
                  <Button variant="secondary" className="text-sm">Add Address</Button>
                </a>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Payment Method</h2>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 transition hover:border-[var(--color-accent)] has-[:checked]:border-[var(--color-accent)] has-[:checked]:bg-blue-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  defaultChecked
                  required
                />
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">💵 Cash on Delivery</span>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Pay when you receive your order
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 opacity-60">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  disabled
                />
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">💳 Credit/Debit Card</span>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Coming soon
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Special Instructions</h2>
            <textarea
              name="specialInstructions"
              placeholder="Any special requests or delivery instructions..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            />
          </div>

          {/* Coupon Code */}
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Coupon Code</h2>
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                name="couponCode"
                placeholder="Enter coupon code"
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
              />
              <Button variant="secondary">Apply</Button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-start-2">
          <div className="sticky top-8 rounded-xl border border-[var(--color-border)] bg-white p-6">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Order Summary</h2>

            {/* Items */}
            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[var(--color-ink)]">
                    {item.item_name} × {item.quantity}
                  </span>
                  <span className="font-semibold text-[var(--color-accent-strong)]">
                    {((item.price_amount * item.quantity) / 100).toFixed(2)} {item.currency}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-3 border-t pt-4 text-sm">
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Subtotal</span>
                <span>{(subtotal / 100).toFixed(2)} {cartItems[0]?.currency}</span>
              </div>
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Delivery Fee</span>
                <span>{(deliveryFee / 100).toFixed(2)} {cartItems[0]?.currency}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-[var(--color-ink)]">
                <span>Total</span>
                <span>{(total / 100).toFixed(2)} {cartItems[0]?.currency}</span>
              </div>
            </div>

            {subtotal < minimumOrder && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                Minimum order: {(minimumOrder / 100).toFixed(2)} {cartItems[0]?.currency}
              </div>
            )}

            <form action={createOrder} className="mt-6">
              <input type="hidden" name="addressId" value={addresses?.[0]?.id || ''} />
              <input type="hidden" name="paymentMethod" value="cash" />
              <Button
                type="submit"
                className="w-full"
                disabled={!addresses || addresses.length === 0 || subtotal < minimumOrder}
              >
                Place Order
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
