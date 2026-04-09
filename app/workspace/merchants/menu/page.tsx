import { requireRole } from '@/lib/auth';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';
import {
  createMenuItem,
  deleteMenuItem,
  createMenuCategory,
  deleteMenuCategory,
  toggleMenuItemAvailability,
} from './actions';

export default async function MenuManagementPage() {
  const session = await requireRole(['merchant', 'admin', 'owner']);

  const db = await getDbExecutor();

  // Get merchant
  const merchant = await db.get(
    `SELECT id, name FROM merchants WHERE owner_user_id = ?`,
    [session.id]
  );

  if (!merchant) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">No Merchant Profile</h2>
          <p className="mt-2 text-sm text-yellow-700">
            You need to set up your merchant profile first.
          </p>
        </div>
      </main>
    );
  }

  // Get categories
  const categories = await db.all(
    `SELECT * FROM menu_categories WHERE merchant_id = ? ORDER BY sort_order`,
    [merchant.id]
  );

  // Get menu items
  const menuItems = await db.all(
    `SELECT mi.*, mc.name as category_name
     FROM menu_items mi
     LEFT JOIN menu_categories mc ON mi.category_id = mc.id
     WHERE mi.merchant_id = ?
     ORDER BY mi.sort_order, mi.created_at DESC`,
    [merchant.id]
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Menu Management</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Manage your menu items, categories, and availability
          </p>
        </div>
      </div>

      {/* Create Category Form */}
      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Add New Category</h2>
        <form action={createMenuCategory} className="mt-4 flex gap-3">
          <input
            type="text"
            name="name"
            placeholder="Category name (e.g., Appetizers, Main Course)"
            required
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
          />
          <Button type="submit">Add Category</Button>
        </form>
      </div>

      {/* Categories List */}
      {categories && categories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">Categories</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(categories as any[]).map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-[var(--color-border)] bg-white p-4"
              >
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">{category.name}</h3>
                <form action={deleteMenuCategory.bind(null, category.id)} className="mt-3">
                  <Button type="submit" variant="secondary" className="w-full text-sm">
                    Delete Category
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Menu Item Form */}
      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Add New Menu Item</h2>
        <form action={createMenuItem} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Price *
            </label>
            <input
              type="number"
              name="price"
              required
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={3}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Category
            </label>
            <select
              name="categoryId"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            >
              <option value="">No Category</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(214,107,66,0.18)]"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Add Menu Item</Button>
          </div>
        </form>
      </div>

      {/* Menu Items List */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-[var(--color-ink)]">Menu Items</h2>
        {menuItems && menuItems.length > 0 ? (
          <div className="space-y-4">
            {(menuItems as any[]).map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border bg-white p-6 ${
                  item.is_available
                    ? 'border-[var(--color-border)]'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_available
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{item.description}</p>
                    <div className="mt-3 flex items-center gap-6 text-sm">
                      <span className="font-semibold text-[var(--color-accent-strong)]">
                        {(item.price_amount / 100).toFixed(2)} {item.currency}
                      </span>
                      {item.category_name && (
                        <span className="text-[var(--color-muted)]">
                          Category: {item.category_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleMenuItemAvailability.bind(null, item.id)}>
                      <Button type="submit" variant="secondary" className="text-sm">
                        {item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                      </Button>
                    </form>
                    <form action={deleteMenuItem.bind(null, item.id)}>
                      <Button type="submit" variant="secondary" className="text-sm">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-12 text-center">
            <p className="text-lg text-[var(--color-muted)]">No menu items yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Add your first menu item using the form above
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
