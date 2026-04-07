import Link from "next/link";
import { useState } from "react";

interface CustomerWorkspacePanelProps {
  data: {
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string;
      created_at: string;
      total_orders: number;
      total_spent: number;
      currency: string;
      favorite_merchants: Array<{
        id: string;
        name: string;
        slug: string;
        rating: number;
        order_count: number;
      }>;
    };
    recentOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      payment_status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      merchant_name: string;
      merchant_slug: string;
      driver_name: string;
      age_minutes: number;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
    }>;
    activeOrder: {
      id: string;
      order_code: string;
      status: string;
      payment_status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      merchant_name: string;
      merchant_slug: string;
      driver_name: string;
      driver_phone: string;
      estimated_delivery: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      tracking_steps: Array<{
        step: string;
        completed: boolean;
        timestamp?: string;
      }>;
    } | null;
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: "order" | "promotion" | "system";
      created_at: string;
      read: boolean;
    }>;
  };
  formatDate: (value: string) => string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function statusColor(status: string) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-purple-100 text-purple-800",
    ready: "bg-indigo-100 text-indigo-800",
    picked_up: "bg-green-100 text-green-800",
    delivered: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800"
  };
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
}

function trackingIcon(completed: boolean) {
  return completed ? "✅" : "⭕";
}

export function EnhancedCustomerWorkspacePanel({ data, formatDate }: CustomerWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "favorites" | "profile" | "notifications">("orders");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const activeOrder = data.activeOrder;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {data.customer.name}!</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your orders, favorites, and account settings
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-lg font-semibold text-gray-900">{data.customer.total_orders}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(data.customer.total_spent, data.customer.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Order Alert */}
      {activeOrder && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🚚</span>
                <div>
                  <p className="font-semibold text-blue-900">
                    Order {activeOrder.order_code} is on the way!
                  </p>
                  <p className="text-sm text-blue-700">
                    Estimated delivery: {activeOrder.estimated_delivery}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(activeOrder.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Track Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "orders", label: "Orders", icon: "📦" },
              { id: "favorites", label: "Favorites", icon: "❤️" },
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "notifications", label: "Notifications", icon: "🔔" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.id === "notifications" && data.notifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                    {data.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-8">
            {/* Active Order Details */}
            {activeOrder && selectedOrder === activeOrder.id && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Order {activeOrder.order_code}
                    </h2>
                    <p className="text-sm text-gray-600">{activeOrder.merchant_name}</p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor(activeOrder.status)}`}>
                    {activeOrder.status}
                  </span>
                </div>

                {/* Tracking Steps */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Tracking</h3>
                  <div className="space-y-3">
                    {activeOrder.tracking_steps.map((step, index) => (
                      <div key={step.step} className="flex items-center space-x-3">
                        <span className="text-xl">{trackingIcon(step.completed)}</span>
                        <div className="flex-1">
                          <p className={`font-medium ${step.completed ? "text-gray-900" : "text-gray-500"}`}>
                            {step.step}
                          </p>
                          {step.timestamp && (
                            <p className="text-sm text-gray-500">{formatDate(step.timestamp)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-2">
                    {activeOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity, activeOrder.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Driver Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">Driver: {activeOrder.driver_name}</p>
                    <p className="text-sm text-gray-600">Phone: {activeOrder.driver_phone}</p>
                    <p className="text-sm text-gray-600">Estimated: {activeOrder.estimated_delivery}</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Contact Driver
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    View Receipt
                  </button>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
              <div className="space-y-4">
                {data.recentOrders.length ? (
                  data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_code}</p>
                          <p className="text-sm text-gray-600">{order.merchant_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatCurrency(order.total_amount, order.currency)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          {order.items.length} items • {formatDate(order.created_at)}
                        </p>
                        <Link
                          href={`/workspace/orders/${order.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No recent orders</p>
                    <Link
                      href="/workspace/merchants"
                      className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Merchants
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Favorite Merchants</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.customer.favorite_merchants.length ? (
                  data.customer.favorite_merchants.map((merchant) => (
                    <div
                      key={merchant.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{merchant.name}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-sm text-gray-600 ml-1">{merchant.rating}</span>
                          </div>
                        </div>
                        <button className="text-red-500 hover:text-red-700">
                          ❤️
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {merchant.order_count} orders placed
                      </p>
                      
                      <Link
                        href={`/workspace/merchants/${merchant.slug}`}
                        className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Order Again
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No favorite merchants yet</p>
                    <Link
                      href="/workspace/merchants"
                      className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Discover Merchants
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{data.customer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{data.customer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{data.customer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                    <p className="text-gray-900">{formatDate(data.customer.created_at)}</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Statistics</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{data.customer.total_orders}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(data.customer.total_spent, data.customer.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
              <div className="space-y-4">
                {data.notifications.length ? (
                  data.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow ${
                        !notification.read ? "border-blue-200 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {notification.type === "order" ? "📦" : 
                             notification.type === "promotion" ? "🎉" : "🔔"}
                          </span>
                          <p className="font-semibold text-gray-900">{notification.title}</p>
                        </div>
                        {!notification.read && (
                          <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">New</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatDate(notification.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
