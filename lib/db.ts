import { randomUUID } from "node:crypto";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { sqlite } from "@/lib/sqlite";

type QueryParams = Array<string | number | boolean | null>;

export interface DbExecutor {
  get<T>(query: string, params?: QueryParams): Promise<T | undefined>;
  all<T>(query: string, params?: QueryParams): Promise<T[]>;
  run(query: string, params?: QueryParams): Promise<void>;
}

const globalForDb = globalThis as unknown as {
  postgresSql?: Sql;
  databaseReady?: Promise<void>;
};

const postgresUrl =
  process.env.DATABASE_URL || process.env.DATABASE_POSTGRES_URL || "";

const usePostgres = postgresUrl.startsWith("postgres");

function toPgPlaceholders(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function createSqlClient() {
  return postgres(postgresUrl, {
    prepare: false,
    max: 1,
  });
}

function getSqlClient() {
  if (!globalForDb.postgresSql) {
    globalForDb.postgresSql = createSqlClient();
  }

  return globalForDb.postgresSql;
}

function createSqliteExecutor(): DbExecutor {
  return {
    async get<T>(query: string, params: QueryParams = []) {
      return sqlite.prepare(query).get(...params) as T | undefined;
    },
    async all<T>(query: string, params: QueryParams = []) {
      return sqlite.prepare(query).all(...params) as T[];
    },
    async run(query: string, params: QueryParams = []) {
      sqlite.prepare(query).run(...params);
    },
  };
}

function createPostgresExecutor(sqlClient: Sql | TransactionSql): DbExecutor {
  return {
    async get<T>(query: string, params: QueryParams = []) {
      const rows = await sqlClient.unsafe<T[]>(toPgPlaceholders(query), params);
      return rows[0];
    },
    async all<T>(query: string, params: QueryParams = []) {
      return sqlClient.unsafe<T[]>(toPgPlaceholders(query), params);
    },
    async run(query: string, params: QueryParams = []) {
      await sqlClient.unsafe(toPgPlaceholders(query), params);
    },
  };
}

async function initializePostgresSchema(executor: DbExecutor) {
  await executor.run(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'customer',
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      label TEXT,
      street TEXT NOT NULL,
      building TEXT NOT NULL,
      floor TEXT,
      apartment TEXT,
      district TEXT,
      city TEXT NOT NULL,
      notes TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
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
      rating DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS merchant_hours (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (merchant_id, day_of_week)
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
      vehicle_type TEXT NOT NULL,
      license_number TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      availability TEXT NOT NULL DEFAULT 'offline',
      current_latitude DOUBLE PRECISION,
      current_longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (merchant_id, name)
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES menu_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      price_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      option_groups TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_code TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
      driver_id TEXT REFERENCES driver_profiles(id) ON DELETE SET NULL,
      delivery_address_id TEXT NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      subtotal_amount INTEGER NOT NULL,
      delivery_fee_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      special_instructions TEXT,
      estimated_delivery_time TIMESTAMPTZ,
      confirmed_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
      menu_item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_amount INTEGER NOT NULL,
      total_price_amount INTEGER NOT NULL,
      selected_options_json TEXT,
      special_instructions TEXT
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_ref TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      status TEXT NOT NULL,
      processed_at TIMESTAMPTZ,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS financial_ledger_entries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      entry_type TEXT NOT NULL,
      party_type TEXT NOT NULL,
      party_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SAR',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS order_disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      opened_by_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
      opened_by_role TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      resolution_note TEXT,
      resolved_by_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMPTZ
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      meta_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS shopping_carts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      special_instructions TEXT,
      selected_options_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, menu_item_id)
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
      balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'SAR',
      is_default BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      metadata_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS loyalty_points (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'bronze',
      next_tier_points INTEGER NOT NULL DEFAULT 500,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await executor.run(`
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      value_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      points_cost INTEGER NOT NULL,
      tier TEXT NOT NULL DEFAULT 'all',
      category TEXT NOT NULL DEFAULT 'general',
      image_url TEXT,
      valid_until TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function seedPostgresWalletData(executor: DbExecutor, now: string) {
  const customer = await executor.get<{ id: string }>(
    `SELECT id
     FROM app_users
     WHERE id = ?
     LIMIT 1`,
    ["user_customer_01"],
  );

  if (!customer) {
    return;
  }

  await executor.run(
    `INSERT INTO wallets (id, user_id, balance, currency, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    ["wallet_customer_01", "user_customer_01", 186.5, "SAR", true, now, now],
  );

  await executor.run(
    `INSERT INTO loyalty_points (
      id, user_id, points, total_earned, total_spent, tier, next_tier_points, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    ["loyalty_customer_01", "user_customer_01", 320, 860, 540, "bronze", 500, now, now],
  );

  const rewardValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString();

  await executor.run(
    `INSERT INTO loyalty_rewards (
      id, title, description, type, value_amount, points_cost, tier, category,
      image_url, valid_until, is_active, usage_limit, usage_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    [
      "reward_wallet_01",
      "Free delivery reward",
      "Redeem for one free delivery on your next order.",
      "free_delivery",
      12,
      150,
      "all",
      "delivery",
      null,
      rewardValidUntil,
      true,
      500,
      18,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO loyalty_rewards (
      id, title, description, type, value_amount, points_cost, tier, category,
      image_url, valid_until, is_active, usage_limit, usage_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    [
      "reward_wallet_02",
      "SAR 20 cashback",
      "Cashback reward credited after your next completed order.",
      "cashback",
      20,
      300,
      "bronze",
      "general",
      null,
      rewardValidUntil,
      true,
      250,
      42,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO wallet_transactions (
      id, wallet_id, user_id, type, amount, description, category, status,
      metadata_json, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    [
      "wallet_tx_01",
      "wallet_customer_01",
      "user_customer_01",
      "credit",
      225,
      "Wallet top-up by card",
      "deposit",
      "completed",
      '{"reference":"TOPUP-1001"}',
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO wallet_transactions (
      id, wallet_id, user_id, type, amount, description, category, status,
      metadata_json, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    [
      "wallet_tx_02",
      "wallet_customer_01",
      "user_customer_01",
      "debit",
      38.5,
      "Order payment for SP-1001",
      "order",
      "completed",
      '{"orderId":"order_01"}',
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO wallet_transactions (
      id, wallet_id, user_id, type, amount, description, category, status,
      metadata_json, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING`,
    [
      "wallet_tx_03",
      "wallet_customer_01",
      "user_customer_01",
      "reward",
      15,
      "Loyalty bonus credit",
      "reward",
      "completed",
      '{"bonusId":"LOYALTY-APR"}',
      now,
      now,
    ],
  );
}

async function seedPostgresDatabase(executor: DbExecutor) {
  const existingUsers = await executor.get<{ count: number }>(
    "SELECT COUNT(*)::int as count FROM app_users",
  );

  const now = new Date().toISOString();

  if ((existingUsers?.count ?? 0) > 0) {
    await seedPostgresWalletData(executor, now);
    return;
  }

  await executor.run(
    `INSERT INTO app_users (id, email, role, full_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "user_admin_01",
      "admin@sareepro.local",
      "admin",
      "Operations Admin",
      "+966500000001",
      true,
      now,
      now,
    ],
  );
  await executor.run(
    `INSERT INTO app_users (id, email, role, full_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "user_customer_01",
      "customer@sareepro.local",
      "customer",
      "Amina Hassan",
      "+966500000002",
      true,
      now,
      now,
    ],
  );
  await executor.run(
    `INSERT INTO app_users (id, email, role, full_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "user_merchant_01",
      "merchant@sareepro.local",
      "merchant",
      "Riyadh Kitchen",
      "+966500000003",
      true,
      now,
      now,
    ],
  );
  await executor.run(
    `INSERT INTO app_users (id, email, role, full_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "user_driver_01",
      "driver@sareepro.local",
      "driver",
      "Faisal Delivery",
      "+966500000004",
      true,
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO addresses (
      id, user_id, label, street, building, district, city, notes, is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "addr_customer_01",
      "user_customer_01",
      "Home",
      "King Fahd Road",
      "2451",
      "Al Olaya",
      "Riyadh",
      "Call before arrival",
      true,
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO merchants (
      id, owner_user_id, name, slug, description, phone, cuisine_tags,
      delivery_fee_amount, minimum_order_amount, currency, status, rating, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "merchant_01",
      "user_merchant_01",
      "Riyadh Kitchen",
      "riyadh-kitchen",
      "Modern Saudi comfort food with fast delivery prep.",
      "+966114445555",
      "saudi,grills,bowls",
      1200,
      3500,
      "SAR",
      "active",
      4.8,
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO menu_categories (id, merchant_id, name, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["cat_01", "merchant_01", "Best Sellers", 1, now],
  );

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    await executor.run(
      `INSERT INTO merchant_hours (id, merchant_id, day_of_week, opens_at, closes_at, is_closed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`merchant_hour_01_${dayOfWeek}`, "merchant_01", dayOfWeek, "10:00", "23:30", false],
    );
  }

  await executor.run(
    `INSERT INTO menu_items (
      id, merchant_id, category_id, name, description, price_amount, currency,
      is_available, option_groups, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "item_01",
      "merchant_01",
      "cat_01",
      "Chicken Kabsa Bowl",
      "Fragrant rice, grilled chicken, and house salsa.",
      3900,
      "SAR",
      true,
      '[{"name":"Extras","options":["Sauce","Salad"]}]',
      1,
      now,
      now,
    ],
  );
  await executor.run(
    `INSERT INTO menu_items (
      id, merchant_id, category_id, name, description, price_amount, currency,
      is_available, option_groups, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "item_02",
      "merchant_01",
      "cat_01",
      "Spiced Lentil Soup",
      "Slow cooked lentils with warm Arabic spices.",
      1800,
      "SAR",
      true,
      null,
      2,
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO driver_profiles (
      id, user_id, vehicle_type, license_number, is_verified, availability, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "driver_profile_01",
      "user_driver_01",
      "motorcycle",
      "DRV-445522",
      true,
      "available",
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO orders (
      id, order_code, customer_id, merchant_id, driver_id, delivery_address_id, status,
      payment_method, payment_status, subtotal_amount, delivery_fee_amount, discount_amount,
      total_amount, currency, special_instructions, estimated_delivery_time, confirmed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "order_01",
      "SP-1001",
      "user_customer_01",
      "merchant_01",
      "driver_profile_01",
      "addr_customer_01",
      "confirmed",
      "cash",
      "unpaid",
      5700,
      1200,
      0,
      6900,
      "SAR",
      "Extra salsa on the side",
      now,
      now,
      now,
      now,
    ],
  );

  await executor.run(
    `INSERT INTO order_items (
      id, order_id, menu_item_id, menu_item_name, quantity, unit_price_amount, total_price_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["order_item_01", "order_01", "item_01", "Chicken Kabsa Bowl", 1, 3900, 3900],
  );
  await executor.run(
    `INSERT INTO order_items (
      id, order_id, menu_item_id, menu_item_name, quantity, unit_price_amount, total_price_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["order_item_02", "order_01", "item_02", "Spiced Lentil Soup", 1, 1800, 1800],
  );

  await executor.run(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      "user_admin_01",
      "bootstrap_seeded",
      "system",
      "postgres_database",
      '{"source":"postgres_bootstrap"}',
      now,
    ],
  );

  await executor.run(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      "user_customer_01",
      "Order confirmed",
      "SP-1001 is confirmed and the kitchen has started processing it.",
      "order",
      false,
      "/workspace/orders/order_01",
      now,
    ],
  );

  await executor.run(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      "user_merchant_01",
      "New order in queue",
      "SP-1001 is waiting in your active kitchen queue.",
      "order",
      false,
      "/workspace/orders/order_01",
      now,
    ],
  );

  await seedPostgresWalletData(executor, now);
}

async function ensurePostgresReady() {
  const executor = createPostgresExecutor(getSqlClient());
  await initializePostgresSchema(executor);
  await seedPostgresDatabase(executor);
}

export async function ensureDatabaseReady() {
  if (!usePostgres) {
    return;
  }

  if (!globalForDb.databaseReady) {
    globalForDb.databaseReady = ensurePostgresReady();
  }

  await globalForDb.databaseReady;
}

export async function getDbExecutor(): Promise<DbExecutor> {
  if (usePostgres) {
    await ensureDatabaseReady();
    return createPostgresExecutor(getSqlClient());
  }

  return createSqliteExecutor();
}

export async function withTransaction<T>(callback: (db: DbExecutor) => Promise<T>) {
  if (usePostgres) {
    const sqlClient = getSqlClient();
    return sqlClient.begin(async (transaction) => {
      const executor = createPostgresExecutor(transaction);
      return callback(executor);
    });
  }

  const executor = createSqliteExecutor();
  return callback(executor);
}
