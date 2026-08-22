import { z } from "zod";

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ============================================================
// Order Types
// ============================================================

export const OrderStatusEnum = z.enum([
  "DRAFT",
  "PENDING_CONFIRMATION",
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_FULFILLMENT",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const PaymentStatusEnum = z.enum([
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
  "FAILED",
]);

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const FulfillmentStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "FAILED",
]);

export type FulfillmentStatus = z.infer<typeof FulfillmentStatusEnum>;

export const OrderSourceEnum = z.enum([
  "WHATSAPP",
  "WEB",
  "API",
  "PHONE",
  "IN_STORE",
]);

export type OrderSource = z.infer<typeof OrderSourceEnum>;

// ============================================================
// Product Types
// ============================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  price: number;
  costPrice?: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  aliases: string[];
  lowStockThreshold?: number;
  categoryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Inventory Types
// ============================================================

export interface InventoryItem {
  id: string;
  productId: string;
  businessId: string;
  stockOnHand: number;
  reservedStock: number;
  available: number;
  unit: string;
  lowStockThreshold: number;
  product: Product;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "RESERVATION" | "RELEASE";
  quantity: number;
  reference?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================
// Customer Types
// ============================================================

export const CustomerSegmentEnum = z.enum([
  "NEW",
  "ACTIVE",
  "VIP",
  "INACTIVE",
  "HIGH_VALUE",
  "OVERDUE",
]);

export type CustomerSegment = z.infer<typeof CustomerSegmentEnum>;

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags: string[];
  segment: CustomerSegment;
  totalSpend: number;
  orderCount: number;
  lastOrderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Payment Types
// ============================================================

export const PaymentProviderEnum = z.enum([
  "PAYSTACK",
  "STRIPE",
  "FLUTTERWAVE",
]);

export type PaymentProviderType = z.infer<typeof PaymentProviderEnum>;

export const PaymentRecordStatusEnum = z.enum([
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);

export type PaymentRecordStatus = z.infer<typeof PaymentRecordStatusEnum>;

// ============================================================
// Conversation Types
// ============================================================

export const ConversationChannelEnum = z.enum([
  "WHATSAPP",
  "WEB",
  "API",
  "SMS",
  "EMAIL",
  "TELEGRAM",
]);

export type ConversationChannel = z.infer<typeof ConversationChannelEnum>;

export const ConversationStatusEnum = z.enum([
  "ACTIVE",
  "WAITING",
  "CLOSED",
  "ARCHIVED",
]);

export type ConversationStatus = z.infer<typeof ConversationStatusEnum>;

export interface Message {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  messageType: "TEXT" | "IMAGE" | "DOCUMENT" | "PAYMENT_REQUEST" | "ORDER_CONFIRMATION" | "SYSTEM";
  metadata: Record<string, unknown>;
  sentAt: Date;
  createdAt: Date;
}

// ============================================================
// Delivery Types
// ============================================================

export const DeliveryStatusEnum = z.enum([
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

export interface Delivery {
  id: string;
  businessId: string;
  orderId: string;
  address: string;
  recipientName?: string;
  recipientPhone?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryFee?: number;
  trackingRef?: string;
  status: DeliveryStatus;
  estimatedDate?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// User & Auth Types
// ============================================================

export const RoleEnum = z.enum([
  "PLATFORM_OWNER",
  "BUSINESS_OWNER",
  "MANAGER",
  "STAFF",
]);

export type Role = z.infer<typeof RoleEnum>;

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMember {
  id: string;
  userId: string;
  businessId: string;
  role: Role;
  isOwner: boolean;
  isActive: boolean;
  invitedAt: Date;
  acceptedAt?: Date;
}

// ============================================================
// Subscription Types
// ============================================================

export const SubscriptionStatusEnum = z.enum([
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
  "TRIALING",
]);

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: PlanFeature[];
}

export interface PlanFeature {
  name: string;
  value: number | string | boolean;
  description?: string;
}

// ============================================================
// Automation Types
// ============================================================

export const AutomationTriggerEnum = z.enum([
  "ORDER_CREATED",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
  "LOW_INVENTORY",
  "CUSTOMER_INACTIVE",
  "DELIVERY_COMPLETED",
  "INVOICE_OVERDUE",
  "MANUAL",
]);

export type AutomationTrigger = z.infer<typeof AutomationTriggerEnum>;

export interface AutomationRule {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
}

export interface AutomationCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";
  value: string | number;
}

export interface AutomationAction {
  type: string;
  config: Record<string, unknown>;
}

// ============================================================
// Analytics Types
// ============================================================

export interface AnalyticsOverview {
  revenue: number;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  conversionRate: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface OrderData {
  date: string;
  count: number;
}

export interface TopProduct {
  product: Product;
  totalSold: number;
  totalRevenue: number;
  orderCount: number;
}

// ============================================================
// Webhook Types
// ============================================================

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}
