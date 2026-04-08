export interface Dispute {
  id: string;
  orderId: string;
  orderCode: string;
  status: string;
  reason: string;
  details: string | null;
  openedByRole: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  resolutionNote: string | null;
  customerName: string;
  merchantName: string;
  driverName: string | null;
  totalAmount: number;
  currency: string;
}

export interface DisputeTemplate {
  id: string;
  type: "order" | "delivery" | "payment";
  title: string;
  description: string;
}

export interface DisputeFilter {
  status?: string;
  openedByRole?: string;
}

export interface DisputeListResponse {
  disputes: Dispute[];
  total: number;
  totals: {
    all: number;
    open: number;
    resolved: number;
  };
  filters: {
    status: string;
    openedByRole: string;
  };
}

const DISPUTE_TEMPLATES: DisputeTemplate[] = [
  {
    id: "order-delay",
    type: "delivery",
    title: "Delayed order",
    description: "Review active delivery delays and customer follow-up history.",
  },
  {
    id: "quality-concern",
    type: "order",
    title: "Quality concern",
    description: "Inspect food quality complaints, merchant notes, and order details.",
  },
  {
    id: "payment-review",
    type: "payment",
    title: "Payment review",
    description: "Audit payment-related issues, refund notes, and transaction outcomes.",
  },
];

export class DisputeService {
  async getDisputes(
    _userId?: string,
    filters: DisputeFilter = {},
  ): Promise<DisputeListResponse> {
    const searchParams = new URLSearchParams();

    if (filters.status && filters.status !== "all") {
      searchParams.set("status", filters.status);
    }

    if (filters.openedByRole && filters.openedByRole !== "all") {
      searchParams.set("openedByRole", filters.openedByRole);
    }

    const response = await fetch(`/api/disputes?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load disputes (${response.status})`);
    }

    const payload = (await response.json()) as
      | { data?: DisputeListResponse }
      | DisputeListResponse;

    if ("data" in payload) {
      if (payload.data) {
        return payload.data;
      }

      throw new Error("Dispute payload did not include data");
    }

    if (
      "disputes" in payload &&
      "total" in payload &&
      "totals" in payload &&
      "filters" in payload
    ) {
      return payload;
    }

    throw new Error("Unexpected dispute response shape");
  }

  getDisputeTemplates() {
    return DISPUTE_TEMPLATES;
  }
}

export const disputeService = new DisputeService();
