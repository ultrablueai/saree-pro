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

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'customer',
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      phone TEXT NOT NULL,
      cover_image_url TEXT,
      logo_url TEXT,
      cuisine_tags TEXT NOT NULL,
      delivery_fee_amount INTEGER NOT NULL DEFAULT 0,
      minimum_order_amount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'SAR',
      status TEXT NOT NULL DEFAULT 'draft',
      rating REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    INSERT OR IGNORE INTO app_users (
      id, email, role, full_name, phone, avatar_url, is_active, password_hash,
      email_verified, email_verified_at, created_at, updated_at
    )
    SELECT
      id, email, role, fullName, phone, avatarUrl, isActive, passwordHash,
      emailVerified, emailVerifiedAt, createdAt, updatedAt
    FROM AppUser;

    INSERT OR IGNORE INTO addresses (
      id, user_id, label, street, building, floor, apartment, district, city, notes,
      latitude, longitude, is_default, created_at, updated_at
    )
    SELECT
      id, userId, label, street, building, floor, apartment, district, city, notes,
      latitude, longitude, isDefault, createdAt, updatedAt
    FROM Address;

    INSERT OR IGNORE INTO merchants (
      id, owner_user_id, name, slug, description, phone, cover_image_url, logo_url,
      cuisine_tags, delivery_fee_amount, minimum_order_amount, currency, status, rating,
      created_at, updated_at
    )
    SELECT
      id, ownerUserId, name, slug, description, phone, coverImageUrl, logoUrl,
      cuisineTags, deliveryFeeAmount, minimumOrderAmount, currency, status, rating,
      createdAt, updatedAt
    FROM Merchant;

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

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_carts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      special_instructions TEXT,
      selected_options_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      UNIQUE (user_id, menu_item_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      link TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'SAR',
      is_default INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loyalty_points (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'bronze',
      next_tier_points INTEGER NOT NULL DEFAULT 500,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      value_amount REAL NOT NULL DEFAULT 0,
      points_cost INTEGER NOT NULL,
      tier TEXT NOT NULL DEFAULT 'all',
      category TEXT NOT NULL DEFAULT 'general',
      image_url TEXT,
      valid_until TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedWalletData(now: string) {
  const customer = sqlite
    .prepare("SELECT id FROM app_users WHERE id = ? LIMIT 1")
    .get("user_customer_01") as { id: string } | undefined;

  if (!customer) {
    return;
  }

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO wallets (
        id, user_id, balance, currency, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run("wallet_customer_01", "user_customer_01", 186.5, "SAR", 1, now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO loyalty_points (
        id, user_id, points, total_earned, total_spent, tier, next_tier_points, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "loyalty_customer_01",
      "user_customer_01",
      320,
      860,
      540,
      "bronze",
      500,
      now,
      now,
    );

  const insertReward = sqlite.prepare(`
    INSERT OR IGNORE INTO loyalty_rewards (
      id, title, description, type, value_amount, points_cost, tier, category,
      image_url, valid_until, is_active, usage_limit, usage_count, created_at
    ) VALUES (
      @id, @title, @description, @type, @value_amount, @points_cost, @tier, @category,
      @image_url, @valid_until, @is_active, @usage_limit, @usage_count, @created_at
    )
  `);

  const insertTransaction = sqlite.prepare(`
    INSERT OR IGNORE INTO wallet_transactions (
      id, wallet_id, user_id, type, amount, description, category, status,
      metadata_json, created_at, completed_at
    ) VALUES (
      @id, @wallet_id, @user_id, @type, @amount, @description, @category, @status,
      @metadata_json, @created_at, @completed_at
    )
  `);

  const rewardValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString();

  const transaction = sqlite.transaction(() => {
    insertReward.run({
      id: "reward_wallet_01",
      title: "Free delivery reward",
      description: "Redeem for one free delivery on your next order.",
      type: "free_delivery",
      value_amount: 12,
      points_cost: 150,
      tier: "all",
      category: "delivery",
      image_url: null,
      valid_until: rewardValidUntil,
      is_active: 1,
      usage_limit: 500,
      usage_count: 18,
      created_at: now,
    });

    insertReward.run({
      id: "reward_wallet_02",
      title: "SAR 20 cashback",
      description: "Cashback reward credited after your next completed order.",
      type: "cashback",
      value_amount: 20,
      points_cost: 300,
      tier: "bronze",
      category: "general",
      image_url: null,
      valid_until: rewardValidUntil,
      is_active: 1,
      usage_limit: 250,
      usage_count: 42,
      created_at: now,
    });

    insertTransaction.run({
      id: "wallet_tx_01",
      wallet_id: "wallet_customer_01",
      user_id: "user_customer_01",
      type: "credit",
      amount: 225,
      description: "Wallet top-up by card",
      category: "deposit",
      status: "completed",
      metadata_json: '{"reference":"TOPUP-1001"}',
      created_at: now,
      completed_at: now,
    });

    insertTransaction.run({
      id: "wallet_tx_02",
      wallet_id: "wallet_customer_01",
      user_id: "user_customer_01",
      type: "debit",
      amount: 38.5,
      description: "Order payment for SP-1001",
      category: "order",
      status: "completed",
      metadata_json: '{"orderId":"order_01"}',
      created_at: now,
      completed_at: now,
    });

    insertTransaction.run({
      id: "wallet_tx_03",
      wallet_id: "wallet_customer_01",
      user_id: "user_customer_01",
      type: "reward",
      amount: 15,
      description: "Loyalty bonus credit",
      category: "reward",
      status: "completed",
      metadata_json: '{"bonusId":"LOYALTY-APR"}',
      created_at: now,
      completed_at: now,
    });
  });

  transaction();
}

function seedDatabase() {
  const existingUsers = sqlite
    .prepare("SELECT COUNT(*) as count FROM app_users")
    .get() as { count: number };

  const now = new Date().toISOString();

  if (existingUsers.count > 0) {
    seedWalletData(now);
    return;
  }

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

  const insertMerchantHour = sqlite.prepare(`
    INSERT INTO merchant_hours (
      id, merchant_id, day_of_week, opens_at, closes_at, is_closed
    ) VALUES (
      @id, @merchant_id, @day_of_week, @opens_at, @closes_at, @is_closed
    )
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

  const insertNotification = sqlite.prepare(`
    INSERT INTO notifications (
      id, user_id, title, message, type, is_read, link, created_at
    ) VALUES (
      @id, @user_id, @title, @message, @type, @is_read, @link, @created_at
    )
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

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      insertMerchantHour.run({
        id: `merchant_hour_01_${dayOfWeek}`,
        merchant_id: "merchant_01",
        day_of_week: dayOfWeek,
        opens_at: "10:00",
        closes_at: "23:30",
        is_closed: 0,
      });
    }

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

    insertNotification.run({
      id: "notification_01",
      user_id: "user_customer_01",
      title: "Order confirmed",
      message: "SP-1001 is confirmed and the kitchen has started processing it.",
      type: "order",
      is_read: 0,
      link: "/workspace/orders/order_01",
      created_at: now,
    });

    insertNotification.run({
      id: "notification_02",
      user_id: "user_merchant_01",
      title: "New order in queue",
      message: "SP-1001 is waiting in your active kitchen queue.",
      type: "order",
      is_read: 0,
      link: "/workspace/orders/order_01",
      created_at: now,
    });
  });

  transaction();
  seedWalletData(now);
}

if (!globalForDatabase.sqliteInitialized) {
  initializeSchema();
  seedDatabase();
  globalForDatabase.sqliteInitialized = true;
}
