// Shared types for microservices communication

export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  service: string
}

export interface ServiceRequest {
  id: string
  timestamp: string
  userId?: string
  correlationId?: string
}

// User Service Types
export interface User {
  id: string
  email: string
  role: 'customer' | 'merchant' | 'driver' | 'admin'
  fullName: string
  phone?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  email: string
  role: string
  fullName: string
  phone?: string
  password?: string
}

export interface Address {
  id: string
  userId: string
  label?: string
  street: string
  building: string
  floor?: string
  apartment?: string
  district?: string
  city: string
  notes?: string
  latitude?: number
  longitude?: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Order Service Types
export interface Order {
  id: string
  orderCode: string
  customerId: string
  merchantId: string
  driverId?: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface CreateOrderRequest {
  customerId: string
  merchantId: string
  items: OrderItem[]
  deliveryAddress: Address
  paymentMethod: string
}

export interface OrderItem {
  menuItemId: string
  quantity: number
  unitPriceAmount: number
  specialInstructions?: string
}

// Merchant Service Types
export interface Merchant {
  id: string
  name: string
  slug: string
  description: string
  phone: string
  status: 'draft' | 'active' | 'inactive'
  rating: number
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  merchantId: string
  name: string
  description: string
  priceAmount: number
  currency: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

// Payment Service Types
export interface PaymentTransaction {
  id: string
  orderId: string
  provider: string
  providerRef?: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  processedAt?: string
  createdAt: string
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  currency: string
  provider: string
  paymentMethod: string
}

// Notification Service Types
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

export interface SendNotificationRequest {
  userId: string
  title: string
  message: string
  type: string
  channels: ('push' | 'email' | 'sms')[]
}

// Driver Service Types
export interface Driver {
  id: string
  userId: string
  vehicleType: 'car' | 'motorcycle' | 'bicycle'
  licenseNumber?: string
  isVerified: boolean
  availability: 'offline' | 'online' | 'busy'
  currentLatitude?: number
  currentLongitude?: number
  createdAt: string
  updatedAt: string
}

export interface UpdateDriverLocationRequest {
  driverId: string
  latitude: number
  longitude: number
  timestamp: string
}

// Analytics Service Types
export interface AnalyticsEvent {
  id: string
  eventType: string
  userId?: string
  sessionId?: string
  properties: Record<string, unknown>
  timestamp: string
}

export interface AnalyticsQuery {
  metric: string
  dimensions?: string[]
  filters?: Record<string, unknown>
  timeRange: {
    start: string
    end: string
  }
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
}

// Service Health Types
export interface ServiceHealth {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  checks: Array<{
    name: string
    status: boolean
    error?: string
  }>
  metrics?: {
    uptime: number
    memory: number
    cpu: number
  }
}

// Message Queue Types
export interface ServiceMessage {
  id: string
  type: string
  payload: unknown
  timestamp: string
  sourceService: string
  targetService?: string
  correlationId?: string
}

// Error Types
export interface ServiceError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
  service: string
}

// API Gateway Types
export interface GatewayRequest {
  path: string
  method: string
  headers: Record<string, string>
  body?: unknown
  user?: {
    id: string
    role: string
  }
  timestamp: string
}

export interface GatewayResponse {
  status: number
  headers: Record<string, string>
  body?: unknown
  timestamp: string
  duration: number
}
