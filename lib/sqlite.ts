import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveDatabasePath() {
  if (process.env.VERCEL) {
    const tempDirectory = path.join(os.tmpdir(), "saree-pro");
    fs.mkdirSync(tempDirectory, { recursive: true });
    return path.join(tempDirectory, "dev.db");
  }

  return path.join(process.cwd(), "prisma", "dev.db");
}

const databasePath = resolveDatabasePath();

const globalForDatabase = globalThis as unknown as {
  sqlite?: Database.Database;
  sqliteInitialized?: boolean;
};

function createDatabase() {
  return new Database(databasePath);
}

export const sqlite = globalForDatabase.sqlite ?? createDatabase();

if (!globalForDatabase.sqlite) {
  globalForDatabase.sqlite = sqlite;
}

function initializeSchema() {
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS AppUser (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'customer',
      fullName TEXT NOT NULL,
      phone TEXT,
      avatarUrl TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      passwordHash TEXT,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      emailVerifiedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Address (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      label TEXT,
      street TEXT NOT NULL,
      building TEXT NOT NULL,
      floor TEXT,
      apartment TEXT,
      district TEXT,
      city TEXT NOT NULL,
      notes TEXT,
      latitude REAL,
      longitude REAL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES AppUser(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Merchant (
      id TEXT PRIMARY KEY,
      ownerUserId TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      phone TEXT NOT NULL,
      coverImageUrl TEXT,
      logoUrl TEXT,
      cuisineTags TEXT NOT NULL,
      deliveryFeeAmount INTEGER NOT NULL DEFAULT 0,
      minimumOrderAmount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'SAR',
      status TEXT NOT NULL DEFAULT 'draft',
      rating REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ownerUserId) REFERENCES AppUser(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS merchant_hours (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      is_closed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      UNIQUE (merchant_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      vehicle_type TEXT NOT NULL,
      license_number TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      availability TEXT NOT NULL DEFAULT 'offline',
      current_latitude REAL,
      current_longitude REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      UNIQUE (merchant_id, name)
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      price_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      is_available INTEGER NOT NULL DEFAULT 1,
      option_groups TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_code TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      driver_id TEXT,
      delivery_address_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      subtotal_amount INTEGER NOT NULL,
      delivery_fee_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      special_instructions TEXT,
      estimated_delivery_time TEXT,
      confirmed_at TEXT,
      delivered_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES app_users(id) ON DELETE RESTRICT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE RESTRICT,
      FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT,
      menu_item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_amount INTEGER NOT NULL,
      total_price_amount INTEGER NOT NULL,
      selected_options_json TEXT,
      special_instructions TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_ref TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      status TEXT NOT NULL,
      processed_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_ledger_entries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      party_type TEXT NOT NULL,
      party_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      opened_by_user_id TEXT NOT NULL,
      opened_by_role TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      resolution_note TEXT,
      resolved_by_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (opened_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
      FOREIGN KEY (resolved_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON DELETE SET NULL
    );
  `);
}

function seedDatabase() {
  const existingUsers = sqlite
    .prepare("SELECT COUNT(*) as count FROM app_users")
    .get() as { count: number };

  if (existingUsers.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const insertUser = sqlite.prepare(`
    INSERT INTO app_users (id, email, role, full_name, phone, is_active, created_at, updated_at)
    VALUES (@id, @email, @role, @full_name, @phone, @is_active, @created_at, @updated_at)
  `);

  const insertAddress = sqlite.prepare(`
    INSERT INTO addresses (
      id, user_id, label, street, building, district, city, notes, is_default, created_at, updated_at
    ) VALUES (
      @id, @user_id, @label, @street, @building, @district, @city, @notes, @is_default, @created_at, @updated_at
    )
  `);

  const insertMerchant = sqlite.prepare(`
    INSERT INTO merchants (
      id, owner_user_id, name, slug, description, phone, cuisine_tags,
      delivery_fee_amount, minimum_order_amount, currency, status, rating, created_at, updated_at
    ) VALUES (
      @id, @owner_user_id, @name, @slug, @description, @phone, @cuisine_tags,
      @delivery_fee_amount, @minimum_order_amount, @currency, @status, @rating, @created_at, @updated_at
    )
  `);

  const insertCategory = sqlite.prepare(`
    INSERT INTO menu_categories (id, merchant_id, name, sort_order, created_at)
    VALUES (@id, @merchant_id, @name, @sort_order, @created_at)
  `);

  const insertMenuItem = sqlite.prepare(`
    INSERT INTO menu_items (
      id, merchant_id, category_id, name, description, price_amount, currency,
      is_available, option_groups, sort_order, created_at, updated_at
    ) VALUES (
      @id, @merchant_id, @category_id, @name, @description, @price_amount, @currency,
      @is_available, @option_groups, @sort_order, @created_at, @updated_at
    )
  `);

  const insertDriver = sqlite.prepare(`
    INSERT INTO driver_profiles (
      id, user_id, vehicle_type, license_number, is_verified, availability, created_at, updated_at
    ) VALUES (
      @id, @user_id, @vehicle_type, @license_number, @is_verified, @availability, @created_at, @updated_at
    )
  `);

  const insertOrder = sqlite.prepare(`
    INSERT INTO orders (
      id, order_code, customer_id, merchant_id, driver_id, delivery_address_id, status,
      payment_method, payment_status, subtotal_amount, delivery_fee_amount, discount_amount,
      total_amount, currency, special_instructions, estimated_delivery_time, confirmed_at, created_at, updated_at
    ) VALUES (
      @id, @order_code, @customer_id, @merchant_id, @driver_id, @delivery_address_id, @status,
      @payment_method, @payment_status, @subtotal_amount, @delivery_fee_amount, @discount_amount,
      @total_amount, @currency, @special_instructions, @estimated_delivery_time, @confirmed_at, @created_at, @updated_at
    )
  `);

  const insertOrderItem = sqlite.prepare(`
    INSERT INTO order_items (
      id, order_id, menu_item_id, menu_item_name, quantity, unit_price_amount, total_price_amount
    ) VALUES (
      @id, @order_id, @menu_item_id, @menu_item_name, @quantity, @unit_price_amount, @total_price_amount
    )
  `);

  const insertAuditLog = sqlite.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, meta_json, created_at)
    VALUES (@id, @actor_user_id, @action, @entity_type, @entity_id, @meta_json, @created_at)
  `);

  const transaction = sqlite.transaction(() => {
    insertUser.run({
      id: "user_admin_01",
      email: "admin@sareepro.local",
      role: "admin",
      full_name: "Operations Admin",
      phone: "+966500000001",
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    insertUser.run({
      id: "user_customer_01",
      email: "customer@sareepro.local",
      role: "customer",
      full_name: "Amina Hassan",
      phone: "+966500000002",
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    insertUser.run({
      id: "user_merchant_01",
      email: "merchant@sareepro.local",
      role: "merchant",
      full_name: "Riyadh Kitchen",
      phone: "+966500000003",
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    insertUser.run({
      id: "user_driver_01",
      email: "driver@sareepro.local",
      role: "driver",
      full_name: "Faisal Delivery",
      phone: "+966500000004",
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    insertAddress.run({
      id: "addr_customer_01",
      user_id: "user_customer_01",
      label: "Home",
      street: "King Fahd Road",
      building: "2451",
      district: "Al Olaya",
      city: "Riyadh",
      notes: "Call before arrival",
      is_default: 1,
      created_at: now,
      updated_at: now,
    });

    insertMerchant.run({
      id: "merchant_01",
      owner_user_id: "user_merchant_01",
      name: "Riyadh Kitchen",
      slug: "riyadh-kitchen",
      description: "Modern Saudi comfort food with fast delivery prep.",
      phone: "+966114445555",
      cuisine_tags: "saudi,grills,bowls",
      delivery_fee_amount: 1200,
      minimum_order_amount: 3500,
      currency: "SAR",
      status: "active",
      rating: 4.8,
      created_at: now,
      updated_at: now,
    });

    insertCategory.run({
      id: "cat_01",
      merchant_id: "merchant_01",
      name: "Best Sellers",
      sort_order: 1,
      created_at: now,
    });

    insertMenuItem.run({
      id: "item_01",
      merchant_id: "merchant_01",
      category_id: "cat_01",
      name: "Chicken Kabsa Bowl",
      description: "Fragrant rice, grilled chicken, and house salsa.",
      price_amount: 3900,
      currency: "SAR",
      is_available: 1,
      option_groups: '[{"name":"Extras","options":["Sauce","Salad"]}]',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    });

    insertMenuItem.run({
      id: "item_02",
      merchant_id: "merchant_01",
      category_id: "cat_01",
      name: "Spiced Lentil Soup",
      description: "Slow cooked lentils with warm Arabic spices.",
      price_amount: 1800,
      currency: "SAR",
      is_available: 1,
      option_groups: null,
      sort_order: 2,
      created_at: now,
      updated_at: now,
    });

    insertDriver.run({
      id: "driver_profile_01",
      user_id: "user_driver_01",
      vehicle_type: "motorcycle",
      license_number: "DRV-445522",
      is_verified: 1,
      availability: "available",
      created_at: now,
      updated_at: now,
    });

    insertOrder.run({
      id: "order_01",
      order_code: "SP-1001",
      customer_id: "user_customer_01",
      merchant_id: "merchant_01",
      driver_id: "driver_profile_01",
      delivery_address_id: "addr_customer_01",
      status: "confirmed",
      payment_method: "cash",
      payment_status: "unpaid",
      subtotal_amount: 5700,
      delivery_fee_amount: 1200,
      discount_amount: 0,
      total_amount: 6900,
      currency: "SAR",
      special_instructions: "Extra salsa on the side",
      estimated_delivery_time: now,
      confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    insertOrderItem.run({
      id: "order_item_01",
      order_id: "order_01",
      menu_item_id: "item_01",
      menu_item_name: "Chicken Kabsa Bowl",
      quantity: 1,
      unit_price_amount: 3900,
      total_price_amount: 3900,
    });

    insertOrderItem.run({
      id: "order_item_02",
      order_id: "order_01",
      menu_item_id: "item_02",
      menu_item_name: "Spiced Lentil Soup",
      quantity: 1,
      unit_price_amount: 1800,
      total_price_amount: 1800,
    });

    insertAuditLog.run({
      id: "audit_01",
      actor_user_id: "user_admin_01",
      action: "bootstrap_seeded",
      entity_type: "system",
      entity_id: "local_database",
      meta_json: '{"source":"app_bootstrap"}',
      created_at: now,
    });
  });

  transaction();
}

if (!globalForDatabase.sqliteInitialized) {
  initializeSchema();
  seedDatabase();
  globalForDatabase.sqliteInitialized = true;
}
