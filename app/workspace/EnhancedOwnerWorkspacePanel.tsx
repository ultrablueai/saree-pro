import Link from "next/link";
import { useState } from "react";

interface OwnerWorkspacePanelProps {
  data: {
    metrics: {
      grossSales: string;
      platformFees: string;
      heldEscrow: string;
      releasedFunds: string;
      merchantPayouts: string;
      driverPayouts: string;
      refundedAmount: string;
      pendingOrders: number;
      activeDrivers: number;
      operationalOrders: number;
      highPriorityAlerts: number;
      criticalAlerts: number;
    };
    operationalOrders: Array<{
      id: string;
      order_code: string;
      status: string;
      payment_status: string;
      total_amount: number;
      currency: string;
      created_at: string;
      customer_name: string;
      merchant_name: string;
      driver_name: string;
      driver_assigned: number;
      age_minutes: number;
      alert_severity: "normal" | "medium" | "high" | "critical";
      alert_label: string;
      alert_detail: string;
    }>;
    attentionAlerts: Array<{
      order_id: string;
      order_code: string;
      severity: "medium" | "high" | "critical";
      label: string;
      detail: string;
      age_minutes: number;
      status: string;
    }>;
    paymentLedger: Array<{
      created_at: string;
      status: string;
      amount: number;
      currency: string;
      provider: string;
      order_code: string;
    }>;
    settlementLedger: Array<{
      created_at: string;
      entry_type: string;
      party_type: string;
      amount: number;
      currency: string;
      note: string | null;
      order_code: string;
    }>;
    openDisputes: Array<{
      id: string;
      order_id: string;
      reason: string;
      status: string;
      created_at: string;
      order_code: string;
    }>;
    auditLogs: Array<{
      created_at: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
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

function statusLabel(status: string) {
  if (status === "pending" || status === "confirmed") {
    return "attention";
  }

  if (status === "preparing" || status === "ready") {
    return "processing";
  }

  if (status === "picked_up") {
    return "in transit";
  }

  return status;
}

function alertToneClasses(severity: "normal" | "medium" | "high" | "critical") {
  if (severity === "critical") {
    return "border-red-300 bg-red-50 text-red-800";
  }

  if (severity === "high") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (severity === "medium") {
    return "border-blue-300 bg-blue-50 text-blue-800";
  }

  return "border-gray-300 bg-white text-gray-600";
}

function MetricCard({ label, value, trend, icon }: { 
  label: string; 
  value: string; 
  trend?: "up" | "down" | "neutral";
  icon?: string;
}) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600", 
    neutral: "text-gray-600"
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
    </div>
  );
}

export function EnhancedOwnerWorkspacePanel({ data, formatDate }: OwnerWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "operations" | "finance" | "disputes">("overview");
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Owner Control Center</h1>
              <p className="mt-2 text-sm text-gray-600">
                Real-time platform monitoring and financial oversight
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">System Status</p>
                <p className="text-lg font-semibold text-green-600">● Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "operations", label: "Operations", icon: "🚚" },
              { id: "finance", label: "Finance", icon: "💰" },
              { id: "disputes", label: "Disputes", icon: "⚠️" }
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
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                  label="Gross Sales" 
                  value={data.metrics.grossSales} 
                  trend="up"
                  icon="💵"
                />
                <MetricCard 
                  label="Platform Fees" 
                  value={data.metrics.platformFees} 
                  trend="up"
                  icon="📈"
                />
                <MetricCard 
                  label="Pending Orders" 
                  value={data.metrics.pendingOrders.toString()} 
                  trend="neutral"
                  icon="📋"
                />
                <MetricCard 
                  label="Active Drivers" 
                  value={data.metrics.activeDrivers.toString()} 
                  trend="up"
                  icon="👥"
                />
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard 
                  label="Held Escrow" 
                  value={data.metrics.heldEscrow} 
                  trend="neutral"
                  icon="🔒"
                />
                <MetricCard 
                  label="Released Funds" 
                  value={data.metrics.releasedFunds} 
                  trend="up"
                  icon="✅"
                />
                <MetricCard 
                  label="Refunded Amount" 
                  value={data.metrics.refundedAmount} 
                  trend="down"
                  icon="💸"
                />
              </div>
            </div>

            {/* Alerts Summary */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Alerts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard 
                  label="High Priority Alerts" 
                  value={data.metrics.highPriorityAlerts.toString()} 
                  trend={data.metrics.highPriorityAlerts > 0 ? "up" : "neutral"}
                  icon="⚡"
                />
                <MetricCard 
                  label="Critical Alerts" 
                  value={data.metrics.criticalAlerts.toString()} 
                  trend={data.metrics.criticalAlerts > 0 ? "up" : "neutral"}
                  icon="🚨"
                />
              </div>
            </div>

            {/* Recent Alerts */}
            {data.attentionAlerts.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alerts</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.attentionAlerts.slice(0, 4).map((alert) => (
                    <div
                      key={`${alert.order_id}-${alert.label}`}
                      className={`rounded-lg border p-4 ${alertToneClasses(alert.severity)}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{alert.order_code}</p>
                          <p className="text-sm mt-1">{alert.label}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/60">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm mt-2">{alert.detail}</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs">{alert.status} • {alert.age_minutes} min old</p>
                        <Link
                          href={`/workspace/orders/${alert.order_id}`}
                          className="text-sm font-medium hover:opacity-80"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === "operations" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Operational Queue ({data.metrics.operationalOrders} active orders)
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.operationalOrders.length ? (
                  data.operationalOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_code}</p>
                          <p className="text-sm text-gray-600">
                            {order.customer_name} → {order.merchant_name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {statusLabel(order.status)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${alertToneClasses(order.alert_severity)}`}>
                            {order.alert_label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <p>💰 {formatCurrency(order.total_amount, order.currency)}</p>
                        <p>💳 {order.payment_status}</p>
                        <p>🚚 {order.driver_name}</p>
                        <p>⏰ {order.age_minutes} min</p>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{order.alert_detail}</p>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                        <Link
                          href={`/workspace/orders/${order.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Manage Order →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No active operational orders</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Finance Tab */}
        {activeTab === "finance" && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Payment Ledger */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Ledger</h2>
                <div className="space-y-3">
                  {data.paymentLedger.length ? (
                    data.paymentLedger.map((entry) => (
                      <div
                        key={`${entry.order_code}-${entry.created_at}-${entry.status}`}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900">{entry.order_code}</p>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {entry.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatCurrency(entry.amount, entry.currency)} • {entry.provider}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(entry.created_at)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No payment transactions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settlement Ledger */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Settlement Ledger</h2>
                <div className="space-y-3">
                  {data.settlementLedger.length ? (
                    data.settlementLedger.map((entry) => (
                      <div
                        key={`${entry.order_code}-${entry.created_at}-${entry.entry_type}`}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900">{entry.order_code}</p>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {entry.entry_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.party_type} • {formatCurrency(entry.amount, entry.currency)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {entry.note || "No note"} • {formatDate(entry.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No settlement entries yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === "disputes" && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Open Disputes */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Disputes</h2>
                <div className="space-y-3">
                  {data.openDisputes.length ? (
                    data.openDisputes.map((dispute) => (
                      <div
                        key={dispute.id}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900">{dispute.order_code}</p>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            {dispute.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{dispute.reason}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(dispute.created_at)}</p>
                        <Link
                          href={`/workspace/orders/${dispute.order_id}`}
                          className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Review Dispute →
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No open disputes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Guide */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Resolution Guide</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Dispute Resolution Process</h3>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li>1. Review order details and customer complaint</li>
                    <li>2. Check delivery status and driver feedback</li>
                    <li>3. Decide on refund or release of funds</li>
                    <li>4. Document decision in settlement ledger</li>
                    <li>5. Notify all parties of resolution</li>
                  </ol>
                  <p className="text-xs text-blue-600 mt-3">
                    All refunds and releases flow into the settlement ledger for financial tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Audit Trail</h2>
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {data.auditLogs.slice(0, 10).map((entry) => (
                    <div key={`${entry.created_at}-${entry.action}`} className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-gray-900">{entry.action}</p>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {entry.entity_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {entry.entity_id || "system"} • {formatDate(entry.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
