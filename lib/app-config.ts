export const appConfig = {
  name: "Saree Pro",
  description:
    "A multi-role delivery platform for customers, merchants, drivers, and operations teams.",
  supportEmail: "ops@sareepro.app",
  roles: [
    {
      key: "customer",
      title: "Customer ordering flow",
      description: "Address book, live tracking, and reliable checkout.",
    },
    {
      key: "merchant",
      title: "Merchant operations",
      description: "Menu control, order preparation, and fulfillment readiness.",
    },
    {
      key: "driver",
      title: "Driver dispatch",
      description: "Availability, active deliveries, and route clarity.",
    },
    {
      key: "admin",
      title: "Admin command center",
      description: "Operational oversight, exceptions, and platform health.",
    },
  ],
  milestones: [
    "Authentication and role-aware onboarding",
    "Merchant catalog and menu management",
    "Order lifecycle and dispatch workflow",
    "Payments, notifications, and audit logs",
  ],
} as const;
