'use server';

import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

export async function createOrder(formData: FormData) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const addressId = formData.get('addressId') as string;
  const paymentMethod = formData.get('paymentMethod') as string;
  const couponCode = formData.get('couponCode') as string;
  const specialInstructions = formData.get('specialInstructions') as string;

  // Validate required fields
  if (!addressId || !paymentMethod) {
    return { success: false, error: 'Missing required fields' };
  }

  // Get cart items
  const cartItems = await db.all(
    `SELECT sc.*, mi.price_amount, mi.currency
     FROM shopping_carts sc
     JOIN menu_items mi ON sc.menu_item_id = mi.id
     WHERE sc.user_id = ?`,
    [session.id]
  ) as any[];

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty' };
  }

  // Verify all items are from the same merchant
  const merchantId = cartItems[0].merchant_id;
  const allSameMerchant = cartItems.every(item => item.merchant_id === merchantId);
  
  if (!allSameMerchant) {
    return { success: false, error: 'All items must be from the same merchant' };
  }

  // Verify address belongs to user
  const address = await db.get(
    `SELECT id FROM addresses WHERE id = ? AND user_id = ?`,
    [addressId, session.id]
  );

  if (!address) {
    return { success: false, error: 'Invalid address' };
  }

  // Calculate totals
  const subtotalAmount = cartItems.reduce((sum, item) => {
    return sum + (item.price_amount * item.quantity);
  }, 0);

  // Get merchant delivery fee
  const merchant = await db.get(
    `SELECT delivery_fee_amount, minimum_order_amount, currency FROM merchants WHERE id = ?`,
    [merchantId]
  );

  if (!merchant) {
    return { success: false, error: 'Merchant not found' };
  }

  // Check minimum order amount
  if (subtotalAmount < merchant.minimum_order_amount) {
    return {
      success: false,
      error: `Minimum order amount is ${(merchant.minimum_order_amount / 100).toFixed(2)} ${merchant.currency}`
    };
  }

  const deliveryFeeAmount = merchant.delivery_fee_amount;
  
  // Apply coupon if provided
  let discountAmount = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const coupon = await db.get(
      `SELECT * FROM coupons WHERE code = ? AND is_active = 1`,
      [couponCode]
    );

    if (coupon) {
      // Check validity
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now >= validFrom && (!validUntil || now <= validUntil)) {
        // Check usage limit
        if (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) {
          // Check minimum order amount
          if (subtotalAmount >= coupon.min_order_amount) {
            // Calculate discount
            if (coupon.discount_type === 'percentage') {
              discountAmount = Math.round((subtotalAmount * coupon.discount_value) / 100);
              if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
              }
            } else {
              discountAmount = coupon.discount_value;
            }

            couponId = coupon.id;
          }
        }
      }
    }
  }

  const totalAmount = subtotalAmount + deliveryFeeAmount - discountAmount;

  // Generate order code
  const orderCode = `SP${Date.now().toString().slice(-8)}`;

  // Create order
  const orderId = randomUUID();

  await db.run(
    `INSERT INTO orders (
      id, order_code, customer_id, merchant_id, delivery_address_id,
      coupon_id, status, payment_method, payment_status,
      subtotal_amount, delivery_fee_amount, discount_amount, total_amount,
      currency, special_instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'unpaid', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      orderId,
      orderCode,
      session.id,
      merchantId,
      addressId,
      couponId,
      paymentMethod,
      subtotalAmount,
      deliveryFeeAmount,
      discountAmount,
      totalAmount,
      merchant.currency,
      specialInstructions || null
    ]
  );

  // Create order items
  for (const item of cartItems) {
    const orderItemId = randomUUID();
    const totalPriceAmount = item.price_amount * item.quantity;

    await db.run(
      `INSERT INTO order_items (
        id, order_id, menu_item_id, menu_item_name, quantity,
        unit_price_amount, total_price_amount, special_instructions,
        selected_options_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        orderItemId,
        orderId,
        item.menu_item_id,
        item.menu_item_name || 'Item',
        item.quantity,
        item.price_amount,
        totalPriceAmount,
        item.special_instructions || null,
        item.selected_options_json || null
      ]
    );
  }

  // Clear cart
  await db.run(`DELETE FROM shopping_carts WHERE user_id = ?`, [session.id]);

  // Update coupon usage
  if (couponId) {
    await db.run(
      `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`,
      [couponId]
    );
  }

  revalidatePath('/workspace/orders');
  return { success: true, orderId, orderCode };
}

export async function addAddress(formData: FormData) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const label = formData.get('label') as string;
  const street = formData.get('street') as string;
  const building = formData.get('building') as string;
  const floor = formData.get('floor') as string;
  const apartment = formData.get('apartment') as string;
  const district = formData.get('district') as string;
  const city = formData.get('city') as string;
  const notes = formData.get('notes') as string;
  const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
  const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;
  const isDefault = formData.get('isDefault') === 'true';

  if (!street || !building || !city) {
    return { success: false, error: 'Street, building, and city are required' };
  }

  const addressId = randomUUID();

  await db.run(
    `INSERT INTO addresses (
      id, user_id, label, street, building, floor, apartment,
      district, city, notes, latitude, longitude, is_default,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      addressId,
      session.id,
      label || null,
      street,
      building,
      floor || null,
      apartment || null,
      district || null,
      city,
      notes || null,
      latitude,
      longitude,
      isDefault
    ]
  );

  revalidatePath('/workspace/addresses');
  return { success: true, addressId };
}

export async function updateAddress(addressId: string, formData: FormData) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify ownership
  const address = await db.get(
    `SELECT id FROM addresses WHERE id = ? AND user_id = ?`,
    [addressId, session.id]
  );

  if (!address) {
    return { success: false, error: 'Address not found' };
  }

  const label = formData.get('label') as string;
  const street = formData.get('street') as string;
  const building = formData.get('building') as string;
  const floor = formData.get('floor') as string;
  const apartment = formData.get('apartment') as string;
  const district = formData.get('district') as string;
  const city = formData.get('city') as string;
  const notes = formData.get('notes') as string;
  const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
  const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;

  await db.run(
    `UPDATE addresses SET
      label = ?, street = ?, building = ?, floor = ?, apartment = ?,
      district = ?, city = ?, notes = ?, latitude = ?, longitude = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
    [
      label || null,
      street,
      building,
      floor || null,
      apartment || null,
      district || null,
      city,
      notes || null,
      latitude,
      longitude,
      addressId
    ]
  );

  revalidatePath('/workspace/addresses');
  return { success: true };
}

export async function deleteAddress(addressId: string) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify ownership
  const address = await db.get(
    `SELECT id FROM addresses WHERE id = ? AND user_id = ?`,
    [addressId, session.id]
  );

  if (!address) {
    return { success: false, error: 'Address not found' };
  }

  // Check if address is used in orders
  const orderCount = await db.get(
    `SELECT COUNT(*) as count FROM orders WHERE delivery_address_id = ?`,
    [addressId]
  );

  if (orderCount?.count > 0) {
    return { success: false, error: 'Cannot delete address used in orders' };
  }

  await db.run(`DELETE FROM addresses WHERE id = ?`, [addressId]);

  revalidatePath('/workspace/addresses');
  return { success: true };
}
