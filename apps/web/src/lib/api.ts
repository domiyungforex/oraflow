/**
 * OrderFlow API Client
 * Centralized API client for all backend requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============================================================
// Types
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface OrderFilters extends PaginationParams {
  status?: string;
  search?: string;
}

export interface ProductFilters extends PaginationParams {
  search?: string;
  category?: string;
  active?: string;
}

export interface CustomerFilters extends PaginationParams {
  search?: string;
  segment?: string;
}

export interface InventoryFilters extends PaginationParams {
  lowStock?: string;
}

export interface PaymentFilters extends PaginationParams {
  status?: string;
  orderId?: string;
}

export interface ConversationFilters extends PaginationParams {
  status?: string;
  channel?: string;
}

// ============================================================
// Token Provider
// ============================================================

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

async function getToken(): Promise<string | null> {
  if (tokenProvider) {
    return tokenProvider();
  }
  return null;
}

// ============================================================
// Base Fetch Wrapper
// ============================================================

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = data.error || {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    };
    throw new ApiRequestError(error.message, response.status, error.code, error);
  }

  return data;
}

// ============================================================
// Custom Error Class
// ============================================================

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================================================
// Orders API
// ============================================================

export const ordersApi = {
  list: (params?: OrderFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/orders${query ? `?${query}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/orders/${id}`),

  create: (data: {
    customerId?: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    notes?: string;
    deliveryFee?: number;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string, reason?: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/orders/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Products API
// ============================================================

export const productsApi = {
  list: (params?: ProductFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.active) searchParams.set("active", params.active);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/products${query ? `?${query}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/products/${id}`),

  create: (data: {
    name: string;
    sku?: string;
    description?: string;
    price: number;
    costPrice?: number;
    unit?: string;
    categoryId?: string;
    aliases?: string[];
    lowStockThreshold?: number;
    imageUrl?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{
    name: string;
    sku: string;
    description: string;
    price: number;
    costPrice: number;
    unit: string;
    categoryId: string;
    aliases: string[];
    lowStockThreshold: number;
    imageUrl: string;
  }>) =>
    apiFetch<ApiResponse<any>>(`/api/v1/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/products/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Customers API
// ============================================================

export const customersApi = {
  list: (params?: CustomerFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.segment) searchParams.set("segment", params.segment);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/customers${query ? `?${query}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/customers/${id}`),

  create: (data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    tags?: string[];
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    tags: string[];
  }>) =>
    apiFetch<ApiResponse<any>>(`/api/v1/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/customers/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Inventory API
// ============================================================

export const inventoryApi = {
  list: (params?: InventoryFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.lowStock) searchParams.set("lowStock", params.lowStock);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/inventory${query ? `?${query}` : ""}`);
  },

  get: (productId: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/inventory/${productId}`),

  adjust: (data: {
    productId: string;
    quantity: number;
    type: "IN" | "OUT" | "ADJUSTMENT";
    notes?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/inventory/adjust", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateThreshold: (productId: string, threshold: number) =>
    apiFetch<ApiResponse<any>>("/api/v1/inventory/threshold", {
      method: "PUT",
      body: JSON.stringify({ productId, threshold }),
    }),

  getMovements: (productId: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(
      `/api/v1/inventory/movements/${productId}${query ? `?${query}` : ""}`
    );
  },
};

// ============================================================
// Payments API
// ============================================================

export const paymentsApi = {
  list: (params?: PaymentFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.orderId) searchParams.set("orderId", params.orderId);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/payments${query ? `?${query}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/payments/${id}`),

  initiate: (data: {
    orderId: string;
    email: string;
    amount: number;
    currency?: string;
    callbackUrl?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/payments/initiate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verify: (reference: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/payments/verify/${reference}`, {
      method: "POST",
    }),

  refund: (id: string, reason?: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/payments/refund/${id}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================
// Conversations API
// ============================================================

export const conversationsApi = {
  list: (params?: ConversationFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.channel) searchParams.set("channel", params.channel);
    const query = searchParams.toString();
    return apiFetch<ApiListResponse<any>>(`/api/v1/conversations${query ? `?${query}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/conversations/${id}`),

  create: (data: {
    customerId?: string;
    channel: string;
    initialMessage?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  send: (data: {
    conversationId: string;
    content: string;
    messageType?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/conversations/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<ApiResponse<any>>(`/api/v1/conversations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ============================================================
// Analytics API
// ============================================================

export const analyticsApi = {
  overview: (period?: string) => {
    const query = period ? `?period=${period}` : "";
    return apiFetch<ApiResponse<any>>(`/api/v1/analytics/overview${query}`);
  },

  revenue: (days?: number) => {
    const query = days ? `?days=${days}` : "";
    return apiFetch<ApiResponse<any>>(`/api/v1/analytics/revenue${query}`);
  },

  orders: (days?: number) => {
    const query = days ? `?days=${days}` : "";
    return apiFetch<ApiResponse<any>>(`/api/v1/analytics/orders${query}`);
  },

  topProducts: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : "";
    return apiFetch<ApiResponse<any>>(`/api/v1/analytics/top-products${query}`);
  },

  customers: () =>
    apiFetch<ApiResponse<any>>("/api/v1/analytics/customers"),

  fulfillment: () =>
    apiFetch<ApiResponse<any>>("/api/v1/analytics/fulfillment"),
};

// ============================================================
// Business API
// ============================================================

export const businessApi = {
  get: () =>
    apiFetch<ApiResponse<any>>("/api/v1/auth/business"),

  create: (data: {
    name: string;
    industry?: string;
    country?: string;
    currency?: string;
    timezone?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website?: string;
  }) =>
    apiFetch<ApiResponse<any>>("/api/v1/auth/business", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (data: Partial<{
    name: string;
    industry: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    website: string;
    taxRate: number;
    deliveryFee: number;
  }>) =>
    apiFetch<ApiResponse<any>>("/api/v1/auth/business", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getMembers: () =>
    apiFetch<ApiResponse<any>>("/api/v1/auth/business/members"),

  inviteMember: (email: string, role?: string) =>
    apiFetch<ApiResponse<any>>("/api/v1/auth/business/members/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
};

// ============================================================
// Webhooks API
// ============================================================

export const webhooksApi = {
  // WhatsApp webhook verification is handled server-side
  // This is just for the frontend to trigger tests
};

// ============================================================
// Health API
// ============================================================

export const healthApi = {
  check: () =>
    apiFetch<{ status: string; checks: Record<string, { status: string; latency?: number }> }>(
      "/api/v1/health"
    ),

  ready: () =>
    apiFetch<{ status: string }>("/api/v1/health/ready"),

  live: () =>
    apiFetch<{ status: string }>("/api/v1/health/live"),
};
