import { randomUUID } from "node:crypto";
import { getDbExecutor } from "@/lib/db";

export interface CartItem {
  id: string;
  userId: string;
  merchantId: string;
  menuItemId: string;
  quantity: number;
  specialInstructions: string | null;
  selectedOptionsJson: string | null;
  menuItemName: string;
  menuItemPrice: number;
  menuItemImageUrl: string | null;
  merchantName: string;
  merchantSlug: string;
}

export async function getCartByUserId(userId: string): Promise<CartItem[]> {
  const db = await getDbExecutor();
  return db.all<CartItem>(
    `SELECT
       c.id,
       c.user_id as userId,
       c.merchant_id as merchantId,
       c.menu_item_id as menuItemId,
       c.quantity,
       c.special_instructions as specialInstructions,
       c.selected_options_json as selectedOptionsJson,
       mi.name as menuItemName,
       mi.price_amount as menuItemPrice,
       mi.image_url as menuItemImageUrl,
       m.name as merchantName,
       m.slug as merchantSlug
     FROM shopping_carts c
     INNER JOIN menu_items mi ON c.menu_item_id = mi.id
     INNER JOIN merchants m ON c.merchant_id = m.id
     WHERE c.user_id = ?
     ORDER BY c.updated_at DESC`,
    [userId],
  );
}

export async function addToCart(
  userId: string,
  merchantId: string,
  menuItemId: string,
  quantity = 1,
  specialInstructions?: string,
  selectedOptions?: unknown,
): Promise<void> {
  const db = await getDbExecutor();
  const existingItem = await db.get<{ id: string; quantity: number }>(
    `SELECT id, quantity
     FROM shopping_carts
     WHERE user_id = ? AND menu_item_id = ?
     LIMIT 1`,
    [userId, menuItemId],
  );

  if (existingItem) {
    await db.run(
      `UPDATE shopping_carts
       SET quantity = quantity + ?, special_instructions = ?, selected_options_json = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        quantity,
        specialInstructions ?? null,
        selectedOptions ? JSON.stringify(selectedOptions) : null,
        existingItem.id,
      ],
    );
    return;
  }

  await db.run(
    `INSERT INTO shopping_carts (
      id, user_id, merchant_id, menu_item_id, quantity, special_instructions,
      selected_options_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      randomUUID(),
      userId,
      merchantId,
      menuItemId,
      quantity,
      specialInstructions ?? null,
      selectedOptions ? JSON.stringify(selectedOptions) : null,
    ],
  );
}

export async function updateCartItemQuantity(
  userId: string,
  menuItemId: string,
  quantity: number,
): Promise<void> {
  const db = await getDbExecutor();

  if (quantity <= 0) {
    await removeFromCart(userId, menuItemId);
    return;
  }

  await db.run(
    `UPDATE shopping_carts
     SET quantity = ?, updated_at = datetime('now')
     WHERE user_id = ? AND menu_item_id = ?`,
    [quantity, userId, menuItemId],
  );
}

export async function removeFromCart(userId: string, menuItemId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `DELETE FROM shopping_carts
     WHERE user_id = ? AND menu_item_id = ?`,
    [userId, menuItemId],
  );
}

export async function clearCart(userId: string): Promise<void> {
  const db = await getDbExecutor();
  await db.run(
    `DELETE FROM shopping_carts
     WHERE user_id = ?`,
    [userId],
  );
}

export async function getCartTotal(
  userId: string,
): Promise<{ subtotal: number; itemCount: number }> {
  const db = await getDbExecutor();
  const result = await db.get<{ subtotal: number | null; itemCount: number | null }>(
    `SELECT
       SUM(c.quantity * mi.price_amount) as subtotal,
       SUM(c.quantity) as itemCount
     FROM shopping_carts c
     INNER JOIN menu_items mi ON c.menu_item_id = mi.id
     WHERE c.user_id = ?`,
    [userId],
  );

  return {
    subtotal: result?.subtotal ?? 0,
    itemCount: result?.itemCount ?? 0,
  };
}
