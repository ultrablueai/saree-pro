import { getDbExecutor } from "@/lib/db";

export interface MerchantSearchParams {
  search?: string;
  cuisineTags?: string[];
  minRating?: number;
  maxDeliveryFee?: number;
  isOpen?: boolean;
  sortBy?: "rating" | "deliveryFee" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface MerchantSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  cuisineTags: string[];
  deliveryFeeAmount: number;
  minimumOrderAmount: number;
  currency: string;
  status: string;
  rating: number;
  isOpen: boolean;
  nextOpenHour: string | null;
}

export interface MerchantHour {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

interface MerchantCountRow {
  count: number;
}

interface MerchantRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  cuisineTags: string;
  deliveryFeeAmount: number;
  minimumOrderAmount: number;
  currency: string;
  status: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface MerchantHourRow {
  merchantId: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: number | boolean;
}

function splitCuisineTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getCurrentTimeContext() {
  const now = new Date();
  return {
    dayOfWeek: now.getDay(),
    currentTime: now.toTimeString().slice(0, 5),
  };
}

function getOpeningState(hours: MerchantHour[]) {
  const { dayOfWeek, currentTime } = getCurrentTimeContext();
  const today = hours.find((hour) => hour.dayOfWeek === dayOfWeek);
  const isOpen = Boolean(
    today &&
      !today.isClosed &&
      today.opensAt <= currentTime &&
      today.closesAt >= currentTime,
  );

  if (isOpen) {
    return { isOpen: true, nextOpenHour: null };
  }

  const upcoming = [...hours]
    .filter((hour) => !hour.isClosed)
    .sort((left, right) => {
      const leftOffset = (left.dayOfWeek - dayOfWeek + 7) % 7;
      const rightOffset = (right.dayOfWeek - dayOfWeek + 7) % 7;
      if (leftOffset !== rightOffset) {
        return leftOffset - rightOffset;
      }
      return left.opensAt.localeCompare(right.opensAt);
    })[0];

  return {
    isOpen: false,
    nextOpenHour: upcoming ? `Day ${upcoming.dayOfWeek} at ${upcoming.opensAt}` : null,
  };
}

async function getHoursMap(merchantIds: string[]) {
  if (merchantIds.length === 0) {
    return new Map<string, MerchantHour[]>();
  }

  const db = await getDbExecutor();
  const placeholders = merchantIds.map(() => "?").join(", ");
  const rows = await db.all<MerchantHourRow>(
    `SELECT
       merchant_id as merchantId,
       day_of_week as dayOfWeek,
       opens_at as opensAt,
       closes_at as closesAt,
       is_closed as isClosed
     FROM merchant_hours
     WHERE merchant_id IN (${placeholders})
     ORDER BY merchant_id, day_of_week ASC, opens_at ASC`,
    merchantIds,
  );

  const hoursMap = new Map<string, MerchantHour[]>();
  for (const row of rows) {
    const current = hoursMap.get(row.merchantId) ?? [];
    current.push({
      dayOfWeek: row.dayOfWeek,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      isClosed: Boolean(row.isClosed),
    });
    hoursMap.set(row.merchantId, current);
  }

  return hoursMap;
}

function mapMerchantRow(row: MerchantRow, hours: MerchantHour[]): MerchantSearchResult {
  const openingState = getOpeningState(hours);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    phone: row.phone,
    coverImageUrl: row.coverImageUrl,
    logoUrl: row.logoUrl,
    cuisineTags: splitCuisineTags(row.cuisineTags),
    deliveryFeeAmount: row.deliveryFeeAmount,
    minimumOrderAmount: row.minimumOrderAmount,
    currency: row.currency,
    status: row.status,
    rating: row.rating,
    isOpen: openingState.isOpen,
    nextOpenHour: openingState.nextOpenHour,
  };
}

async function enrichMerchantRows(rows: MerchantRow[]) {
  const hoursMap = await getHoursMap(rows.map((merchant) => merchant.id));
  return rows.map((row) => mapMerchantRow(row, hoursMap.get(row.id) ?? []));
}

export async function searchMerchants(
  params: MerchantSearchParams,
): Promise<{ merchants: MerchantSearchResult[]; total: number }> {
  const db = await getDbExecutor();
  const {
    search,
    cuisineTags = [],
    minRating = 0,
    maxDeliveryFee,
    isOpen,
    sortBy = "rating",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = params;

  let whereClause = "WHERE m.status = ?";
  const queryParams: Array<string | number> = ["active"];

  if (search) {
    whereClause += " AND (m.name LIKE ? OR m.description LIKE ?)";
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (cuisineTags.length > 0) {
    const tagConditions = cuisineTags.map(() => "m.cuisine_tags LIKE ?").join(" OR ");
    whereClause += ` AND (${tagConditions})`;
    queryParams.push(...cuisineTags.map((tag) => `%${tag}%`));
  }

  if (minRating > 0) {
    whereClause += " AND m.rating >= ?";
    queryParams.push(minRating);
  }

  if (maxDeliveryFee !== undefined) {
    whereClause += " AND m.delivery_fee_amount <= ?";
    queryParams.push(maxDeliveryFee);
  }

  if (isOpen !== undefined) {
    const { dayOfWeek, currentTime } = getCurrentTimeContext();

    whereClause += isOpen
      ? ` AND EXISTS (
          SELECT 1
          FROM merchant_hours mh
          WHERE mh.merchant_id = m.id
            AND mh.day_of_week = ?
            AND mh.is_closed = 0
            AND mh.opens_at <= ?
            AND mh.closes_at >= ?
        )`
      : ` AND NOT EXISTS (
          SELECT 1
          FROM merchant_hours mh
          WHERE mh.merchant_id = m.id
            AND mh.day_of_week = ?
            AND mh.is_closed = 0
            AND mh.opens_at <= ?
            AND mh.closes_at >= ?
        )`;

    queryParams.push(dayOfWeek, currentTime, currentTime);
  }

  const sortMapping: Record<NonNullable<MerchantSearchParams["sortBy"]>, string> = {
    rating: "m.rating",
    deliveryFee: "m.delivery_fee_amount",
    name: "m.name",
    createdAt: "m.created_at",
  };

  const countResult = await db.get<MerchantCountRow>(
    `SELECT COUNT(*) as count
     FROM merchants m
     ${whereClause}`,
    queryParams,
  );
  const total = countResult?.count ?? 0;

  const offset = Math.max(page - 1, 0) * limit;
  const rows = await db.all<MerchantRow>(
    `SELECT
       m.id,
       m.name,
       m.slug,
       m.description,
       m.phone,
       m.cover_image_url as coverImageUrl,
       m.logo_url as logoUrl,
       m.cuisine_tags as cuisineTags,
       m.delivery_fee_amount as deliveryFeeAmount,
       m.minimum_order_amount as minimumOrderAmount,
       m.currency,
       m.status,
       m.rating,
       m.created_at as createdAt,
       m.updated_at as updatedAt
     FROM merchants m
     ${whereClause}
     ORDER BY ${sortMapping[sortBy]} ${sortOrder === "asc" ? "ASC" : "DESC"}, m.name ASC
     LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset],
  );

  return {
    merchants: await enrichMerchantRows(rows),
    total,
  };
}

export async function getMerchantBySlug(slug: string) {
  const db = await getDbExecutor();
  const row = await db.get<MerchantRow>(
    `SELECT
       m.id,
       m.name,
       m.slug,
       m.description,
       m.phone,
       m.cover_image_url as coverImageUrl,
       m.logo_url as logoUrl,
       m.cuisine_tags as cuisineTags,
       m.delivery_fee_amount as deliveryFeeAmount,
       m.minimum_order_amount as minimumOrderAmount,
       m.currency,
       m.status,
       m.rating,
       m.created_at as createdAt,
       m.updated_at as updatedAt
     FROM merchants m
     WHERE m.slug = ?
     LIMIT 1`,
    [slug],
  );

  if (!row) {
    return null;
  }

  const hoursMap = await getHoursMap([row.id]);
  return {
    ...mapMerchantRow(row, hoursMap.get(row.id) ?? []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hours: hoursMap.get(row.id) ?? [],
  };
}

export async function getMerchantById(merchantId: string) {
  const db = await getDbExecutor();
  const row = await db.get<MerchantRow>(
    `SELECT
       m.id,
       m.name,
       m.slug,
       m.description,
       m.phone,
       m.cover_image_url as coverImageUrl,
       m.logo_url as logoUrl,
       m.cuisine_tags as cuisineTags,
       m.delivery_fee_amount as deliveryFeeAmount,
       m.minimum_order_amount as minimumOrderAmount,
       m.currency,
       m.status,
       m.rating,
       m.created_at as createdAt,
       m.updated_at as updatedAt
     FROM merchants m
     WHERE m.id = ?
     LIMIT 1`,
    [merchantId],
  );

  if (!row) {
    return null;
  }

  const hoursMap = await getHoursMap([row.id]);
  return {
    ...mapMerchantRow(row, hoursMap.get(row.id) ?? []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hours: hoursMap.get(row.id) ?? [],
  };
}

export async function getAllMerchants(): Promise<MerchantSearchResult[]> {
  const result = await searchMerchants({
    sortBy: "rating",
    sortOrder: "desc",
    limit: 100,
  });

  return result.merchants;
}
