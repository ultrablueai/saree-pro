'use server';

import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createMenuItem(formData: FormData) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  // Get merchant ID
  const merchant = await db.get(
    `SELECT id FROM merchants WHERE owner_user_id = ?`,
    [session.id]
  );

  if (!merchant) {
    return { success: false, error: 'Merchant profile not found' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = formData.get('price') as string;
  const categoryId = formData.get('categoryId') as string;
  const imageUrl = formData.get('imageUrl') as string;

  if (!name || !description || !price) {
    return { success: false, error: 'All required fields must be filled' };
  }

  const priceAmount = Math.round(parseFloat(price) * 100);

  await db.run(
    `INSERT INTO menu_items (
      id, merchant_id, category_id, name, description, 
      price_amount, image_url, is_available, created_at, updated_at
    ) VALUES (
      lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now')
    )`,
    [merchant.id, categoryId || null, name, description, priceAmount, imageUrl || null]
  );

  revalidatePath('/workspace/merchants/menu');
  return { success: true };
}

export async function updateMenuItem(itemId: string, formData: FormData) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  // Verify ownership
  const merchant = await db.get(
    `SELECT m.id FROM merchants m
     JOIN menu_items mi ON m.id = mi.merchant_id
     WHERE m.owner_user_id = ? AND mi.id = ?`,
    [session.id, itemId]
  );

  if (!merchant) {
    return { success: false, error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = formData.get('price') as string;
  const categoryId = formData.get('categoryId') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const isAvailable = formData.get('isAvailable') === 'true';

  const priceAmount = Math.round(parseFloat(price) * 100);

  await db.run(
    `UPDATE menu_items
     SET name = ?, description = ?, price_amount = ?, 
         category_id = ?, image_url = ?, is_available = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [name, description, priceAmount, categoryId || null, imageUrl || null, isAvailable, itemId]
  );

  revalidatePath('/workspace/merchants/menu');
  return { success: true };
}

export async function deleteMenuItem(itemId: string) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  // Verify ownership
  const merchant = await db.get(
    `SELECT m.id FROM merchants m
     JOIN menu_items mi ON m.id = mi.merchant_id
     WHERE m.owner_user_id = ? AND mi.id = ?`,
    [session.id, itemId]
  );

  if (!merchant) {
    return { success: false, error: 'Unauthorized' };
  }

  await db.run(`DELETE FROM menu_items WHERE id = ?`, [itemId]);

  revalidatePath('/workspace/merchants/menu');
  return { success: true };
}

export async function toggleMenuItemAvailability(itemId: string) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  const item = await db.get(
    `SELECT is_available FROM menu_items WHERE id = ?`,
    [itemId]
  );

  if (!item) {
    return { success: false, error: 'Item not found' };
  }

  await db.run(
    `UPDATE menu_items SET is_available = ?, updated_at = datetime('now') WHERE id = ?`,
    [item.is_available ? 0 : 1, itemId]
  );

  revalidatePath('/workspace/merchants/menu');
  return { success: true };
}

export async function createMenuCategory(formData: FormData) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  const merchant = await db.get(
    `SELECT id FROM merchants WHERE owner_user_id = ?`,
    [session.id]
  );

  if (!merchant) {
    return { success: false, error: 'Merchant profile not found' };
  }

  const name = formData.get('name') as string;

  if (!name) {
    return { success: false, error: 'Category name is required' };
  }

  try {
    await db.run(
      `INSERT INTO menu_categories (id, merchant_id, name, sort_order, created_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, 0, datetime('now'))`,
      [merchant.id, name]
    );

    revalidatePath('/workspace/merchants/menu');
    return { success: true };
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return { success: false, error: 'Category already exists' };
    }
    return { success: false, error: 'Failed to create category' };
  }
}

export async function deleteMenuCategory(categoryId: string) {
  const session = await requireRole(['merchant', 'admin', 'owner']);
  const db = await getDbExecutor();

  const merchant = await db.get(
    `SELECT m.id FROM merchants m
     JOIN menu_categories mc ON m.id = mc.merchant_id
     WHERE m.owner_user_id = ? AND mc.id = ?`,
    [session.id, categoryId]
  );

  if (!merchant) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if category has items
  const itemCount = await db.get(
    `SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?`,
    [categoryId]
  );

  if (itemCount?.count > 0) {
    return { success: false, error: 'Cannot delete category with existing items' };
  }

  await db.run(`DELETE FROM menu_categories WHERE id = ?`, [categoryId]);

  revalidatePath('/workspace/merchants/menu');
  return { success: true };
}
