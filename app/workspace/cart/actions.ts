'use server';

import { requireSessionUser } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function addToCart(formData: FormData) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const menuItemId = formData.get('menuItemId') as string;
  const merchantId = formData.get('merchantId') as string;
  const quantity = parseInt(formData.get('quantity') as string) || 1;
  const specialInstructions = formData.get('specialInstructions') as string;
  const selectedOptionsJson = formData.get('selectedOptions') as string;

  if (!menuItemId || !merchantId) {
    return { success: false, error: 'Missing required fields' };
  }

  // Verify the menu item exists and is available
  const menuItem = await db.get<{id: string, is_available: number, price_amount: number, currency: string}>(
    `SELECT id, is_available, price_amount, currency FROM menu_items WHERE id = ? AND merchant_id = ?`,
    [menuItemId, merchantId]
  );

  if (!menuItem) {
    return { success: false, error: 'Menu item not found' };
  }

  if (!menuItem.is_available) {
    return { success: false, error: 'This item is currently unavailable' };
  }

  // Check if item already in cart
  const existingItem = await db.get(`
    SELECT id, quantity FROM shopping_carts WHERE user_id = ? AND menu_item_id = ?
  `, [session.id, menuItemId]) as {id: string, quantity: number} | undefined;

  if (existingItem) {
    // Update quantity
    await db.run(
      `UPDATE shopping_carts SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
      [quantity, existingItem.id]
    );
  } else {
    // Insert new cart item
    await db.run(
      `INSERT INTO shopping_carts (
        id, user_id, merchant_id, menu_item_id, quantity, 
        special_instructions, selected_options_json, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )`,
      [session.id, merchantId, menuItemId, quantity, specialInstructions || null, selectedOptionsJson || null]
    );
  }

  revalidatePath('/workspace/cart');
  return { success: true };
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  if (quantity <= 0) {
    return await removeFromCart(cartItemId);
  }

  // Verify ownership
  const cartItem = await db.get(
    `SELECT id FROM shopping_carts WHERE id = ? AND user_id = ?`,
    [cartItemId, session.id]
  );

  if (!cartItem) {
    return { success: false, error: 'Cart item not found' };
  }

  await db.run(
    `UPDATE shopping_carts SET quantity = ?, updated_at = datetime('now') WHERE id = ?`,
    [quantity, cartItemId]
  );

  revalidatePath('/workspace/cart');
  return { success: true };
}

export async function removeFromCart(cartItemId: string) {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  // Verify ownership
  const cartItem = await db.get(
    `SELECT id FROM shopping_carts WHERE id = ? AND user_id = ?`,
    [cartItemId, session.id]
  );

  if (!cartItem) {
    return { success: false, error: 'Cart item not found' };
  }

  await db.run(`DELETE FROM shopping_carts WHERE id = ?`, [cartItemId]);

  revalidatePath('/workspace/cart');
  return { success: true };
}

export async function clearCart() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  await db.run(`DELETE FROM shopping_carts WHERE user_id = ?`, [session.id]);

  revalidatePath('/workspace/cart');
  return { success: true };
}

export async function getCart() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const cartItems = await db.all(
    `SELECT 
      sc.*,
      mi.name as item_name,
      mi.description as item_description,
      mi.image_url as item_image,
      mi.price_amount,
      mi.currency,
      mi.is_available,
      m.name as merchant_name,
      m.slug as merchant_slug,
      m.delivery_fee_amount
     FROM shopping_carts sc
     JOIN menu_items mi ON sc.menu_item_id = mi.id
     JOIN merchants m ON sc.merchant_id = m.id
     WHERE sc.user_id = ?
     ORDER BY sc.created_at DESC`,
    [session.id]
  );

  return cartItems;
}

export async function getCartTotal() {
  const session = await requireSessionUser();
  const db = await getDbExecutor();

  const total = await db.get(
    `SELECT 
      SUM(mi.price_amount * sc.quantity) as subtotal,
      COUNT(sc.id) as item_count,
      SUM(sc.quantity) as total_quantity
     FROM shopping_carts sc
     JOIN menu_items mi ON sc.menu_item_id = mi.id
     WHERE sc.user_id = ?`,
    [session.id]
  );

  return {
    subtotal: total?.subtotal || 0,
    itemCount: total?.item_count || 0,
    totalQuantity: total?.total_quantity || 0,
  };
}
