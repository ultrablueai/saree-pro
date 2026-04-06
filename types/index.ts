export type UserRole = 'customer' | 'merchant' | 'driver' | 'admin' | 'owner';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  ownerAccess: boolean;
  passwordHash?: string;
  emailVerified?: boolean;
}

export interface Address {
  id: string;
  userId: string;
  label: string | null;
  street: string;
  building: string;
  floor: string | null;
  apartment: string | null;
  district: string | null;
  city: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface Merchant {
  id: string;
  ownerUserId: string;
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
  hours?: MerchantHour[];
  isOpen?: boolean;
}

export interface MerchantHour {
  id: string;
  merchantId: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface MenuItem {
  id: string;
  merchantId: string;
  categoryId: string | null;
  name: string;
  description: string;
  imageUrl: string | null;
  priceAmount: number;
  currency: string;
  isAvailable: boolean;
  optionGroups: any | null;
  sortOrder: number;
}

export interface MenuCategory {
  id: string;
  merchantId: string;
  name: string;
  sortOrder: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  merchantId: string;
  driverId: string | null;
  deliveryAddressId: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  deliveryFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  specialInstructions: string | null;
  estimatedDeliveryTime: Date | null;
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  menuItemName: string;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;
  selectedOptionsJson: string | null;
  specialInstructions: string | null;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: string;
  processedAt: Date | null;
  failureReason: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metaJson: string | null;
  createdAt: Date;
}

export interface ShoppingCart {
  id: string;
  userId: string;
  merchantId: string;
  menuItemId: string;
  quantity: number;
  specialInstructions: string | null;
  selectedOptionsJson: string | null;
}

export interface Review {
  id: string;
  userId: string;
  merchantId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: Date | null;
  link: string | null;
  createdAt: Date;
}

export type NotificationType = 'order' | 'payment' | 'delivery' | 'review' | 'system' | 'info';

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string;
  licenseNumber: string | null;
  isVerified: boolean;
  availability: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
}
