// TypeScript types for Saree Pro

export interface User {
  id: string
  email: string
  role: 'customer' | 'driver' | 'merchant' | 'admin'
  name: string
  phone?: string
}

export interface Order {
  id: string
  customerId: string
  merchantId: string
  driverId?: string
  items: OrderItem[]
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
  totalAmount: number
  deliveryAddress: Address
  createdAt: Date
  estimatedDeliveryTime?: Date
}

export interface OrderItem {
  id: string
  menuItemId: string
  quantity: number
  price: number
  specialInstructions?: string
}

export interface Address {
  street: string
  building: string
  floor?: string
  apartment?: string
  city: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface MenuItem {
  id: string
  merchantId: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  available: boolean
}