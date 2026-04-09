import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';
import Link from 'next/link';
import {
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
} from './actions';

export default async function CartPage() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Get cart items
  const cartItems = await db.all(
    `SELECT 
      sc.id as cart_id,
      sc.quantity,
      sc.special_instructions,
      mi.id as menu_item_id,
      mi.name as item_name,
      mi.description as item_description,
      mi.image_url as item_image,
      mi.price_amount,
      mi.currency,
      mi.is_available,
      m.id as merchant_id,
      m.name as merchant_name,
      m.slug as merchant_slug,
      m.delivery_fee_amount
     FROM shopping_carts sc
     JOIN menu_items mi ON sc.menu_item_id = mi.id
     JOIN merchants m ON sc.merchant_id = m.id
     WHERE sc.user_id = ?
     ORDER BY sc.created_at DESC`,
    [session.id]
  ) as any[];

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price_amount * item.quantity);
  }, 0);

  const deliveryFee = cartItems.length > 0 ? (cartItems[0]?.delivery_fee_amount || 0) : 0;
  const total = subtotal + deliveryFee;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Shopping Cart</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Review your items before checkout
          </p>
        </div>
        {cartItems.length > 0 && (
          <form action={clearCart}>
            <Button type="submit" variant="secondary">
              Clear Cart
            </Button>
          </form>
        )}
      </div>

      {cartItems.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Cart Items */}
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.cart_id}
                className={`rounded-xl border bg-white p-6 ${
                  item.is_available ? 'border-[var(--color-border)]' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex gap-4">
                  {/* Item Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                    {item.item_image ? (
                      <img
                        src={item.item_image}
                        alt={item.item_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">🍽️</div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                          {item.item_name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {item.merchant_name}
                        </p>
                        {item.special_instructions && (
                          <p className="mt-2 text-xs text-orange-600">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-[var(--color-accent-strong)]">
                        {((item.price_amount * item.quantity) / 100).toFixed(2)} {item.currency}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <form action={async (formData) => {
                          const newQty = item.quantity - 1;
                          await updateCartItemQuantity(item.cart_id, newQty);
                        }}>
                          <button
                            type="submit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-lg font-semibold transition hover:bg-gray-50"
                          >
                            −
                          </button>
                        </form>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <form action={async (formData) => {
                          const newQty = item.quantity + 1;
                          await updateCartItemQuantity(item.cart_id, newQty);
                        }}>
                          <button
                            type="submit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-lg font-semibold transition hover:bg-gray-50"
                          >
                            +
                          </button>
                        </form>
                      </div>

                      {!item.is_available && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Unavailable
                        </span>
                      )}

                      <form action={removeFromCart.bind(null, item.cart_id)}>
                        <button
                          type="submit"
                          className="text-sm text-red-600 hover:text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-start-2">
            <div className="sticky top-8 rounded-xl border border-[var(--color-border)] bg-white p-6">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Order Summary</h2>
              
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Subtotal</span>
                  <span>{(subtotal / 100).toFixed(2)} {cartItems[0]?.currency}</span>
                </div>
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Delivery Fee</span>
                  <span>{(deliveryFee / 100).toFixed(2)} {cartItems[0]?.currency}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold text-[var(--color-ink)]">
                    <span>Total</span>
                    <span>{(total / 100).toFixed(2)} {cartItems[0]?.currency}</span>
                  </div>
                </div>
              </div>

              <Link href="/workspace/checkout" className="mt-6 block">
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>

              <Link
                href="/workspace/merchants"
                className="mt-3 block text-center text-sm text-[var(--color-accent-strong)] hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-16 text-center">
          <div className="text-6xl">🛒</div>
          <h2 className="mt-6 text-2xl font-semibold text-[var(--color-ink)]">
            Your cart is empty
          </h2>
          <p className="mt-3 text-[var(--color-muted)]">
            Add items from merchants to get started
          </p>
          <Link href="/workspace/merchants" className="mt-6 inline-block">
            <Button>Browse Merchants</Button>
          </Link>
        </div>
      )}
    </main>
  );
}
