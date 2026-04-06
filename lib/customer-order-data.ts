import { getDbExecutor } from "@/lib/db";

export interface CustomerOrderWorkspaceData {
  customer: {
    id: string;
    name: string;
    email: string;
  };
  address:
    | {
        id: string;
        label: string | null;
        street: string;
        building: string;
        district: string | null;
        city: string;
        notes: string | null;
      }
    | null;
  merchant:
    | {
        id: string;
        name: string;
        slug: string;
        description: string;
        phone: string;
        delivery_fee_amount: number;
        minimum_order_amount: number;
        currency: string;
        status: string;
        rating: number;
      }
    | null;
  categories: Array<{
    id: string;
    name: string;
    sort_order: number;
  }>;
  items: Array<{
    id: string;
    name: string;
    description: string;
    price_amount: number;
    currency: string;
    is_available: number;
    sort_order: number;
    category_id: string | null;
    category_name: string;
  }>;
}

export async function getCustomerOrderWorkspaceData(
  customerId: string,
): Promise<CustomerOrderWorkspaceData> {
  const db = await getDbExecutor();
  const customer = await db.get<{
    id: string;
    full_name: string;
    email: string;
  }>(
    `SELECT id, full_name, email
     FROM app_users
     WHERE id = ?
     LIMIT 1`,
    [customerId],
  );

  const address = await db.get<{
    id: string;
    label: string | null;
    street: string;
    building: string;
    district: string | null;
    city: string;
    notes: string | null;
  }>(
    `SELECT id, label, street, building, district, city, notes
     FROM addresses
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [customerId],
  );

  const merchant = await db.get<{
    id: string;
    name: string;
    slug: string;
    description: string;
    phone: string;
    delivery_fee_amount: number;
    minimum_order_amount: number;
    currency: string;
    status: string;
    rating: number;
  }>(
    `SELECT id, name, slug, description, phone, delivery_fee_amount,
            minimum_order_amount, currency, status, rating
     FROM merchants
     WHERE status = 'active'
     ORDER BY rating DESC, created_at ASC
     LIMIT 1`,
  );

  if (!customer) {
    return {
      customer: {
        id: customerId,
        name: "Unknown customer",
        email: "",
      },
      address: null,
      merchant: null,
      categories: [],
      items: [],
    };
  }

  const categories = merchant
    ? await db.all<{
        id: string;
        name: string;
        sort_order: number;
      }>(
        `SELECT id, name, sort_order
         FROM menu_categories
         WHERE merchant_id = ?
         ORDER BY sort_order ASC, name ASC`,
        [merchant.id],
      )
    : [];

  const items = merchant
    ? await db.all<{
        id: string;
        name: string;
        description: string;
        price_amount: number;
        currency: string;
        is_available: number;
        sort_order: number;
        category_id: string | null;
        category_name: string;
      }>(
        `SELECT mi.id, mi.name, mi.description, mi.price_amount, mi.currency,
                mi.is_available, mi.sort_order, mi.category_id,
                COALESCE(c.name, 'Uncategorized') as category_name
         FROM menu_items mi
         LEFT JOIN menu_categories c ON c.id = mi.category_id
         WHERE mi.merchant_id = ?
         ORDER BY mi.sort_order ASC, mi.created_at DESC`,
        [merchant.id],
      )
    : [];

  return {
    customer: {
      id: customer.id,
      name: customer.full_name,
      email: customer.email,
    },
    address: address ?? null,
    merchant: merchant ?? null,
    categories,
    items,
  };
}
