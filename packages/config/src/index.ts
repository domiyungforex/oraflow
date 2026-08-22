/**
 * OrderFlow Shared Configuration
 * Centralized configuration for all packages and apps
 */

// ============================================================
// API Configuration
// ============================================================

export const API_CONFIG = {
  /** Default port for the API server */
  port: parseInt(process.env.PORT || "3001", 10),
  
  /** CORS allowed origins */
  corsOrigin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  /** Request body size limit */
  bodyLimit: "10mb",
  
  /** Rate limiting */
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
} as const;

// ============================================================
// Database Configuration
// ============================================================

export const DB_CONFIG = {
  /** Database connection URL */
  url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5444/orderflow?schema=public",
  
  /** Connection pool settings */
  pool: {
    min: 2,
    max: 10,
  },
} as const;

// ============================================================
// Auth Configuration (Clerk)
// ============================================================

export const AUTH_CONFIG = {
  /** Clerk publishable key (client-side) */
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
  
  /** Clerk secret key (server-side) */
  secretKey: process.env.CLERK_SECRET_KEY || "",
  
  /** Clerk webhook secret */
  webhookSecret: process.env.CLERK_WEBHOOK_SECRET || "",
} as const;

// ============================================================
// AI Configuration
// ============================================================

export const AI_CONFIG = {
  /** Anthropic API key */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  
  /** OpenAI API key */
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  
  /** Default AI model */
  defaultModel: "gpt-4o-mini",
  
  /** Use mock provider in development */
  useMock: process.env.NODE_ENV !== "production",
} as const;

// ============================================================
// Payment Configuration (Paystack)
// ============================================================

export const PAYMENT_CONFIG = {
  /** Paystack secret key */
  secretKey: process.env.PAYSTACK_SECRET_KEY || "",
  
  /** Paystack public key */
  publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  
  /** Paystack webhook secret */
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
  
  /** Default currency */
  defaultCurrency: "NGN",
} as const;

// ============================================================
// Messaging Configuration (WhatsApp)
// ============================================================

export const MESSAGING_CONFIG = {
  /** WhatsApp access token */
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  
  /** WhatsApp phone number ID */
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  
  /** WhatsApp verify token */
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  
  /** WhatsApp app secret */
  appSecret: process.env.WHATSAPP_APP_SECRET || "",
} as const;

// ============================================================
// S3 / Object Storage Configuration
// ============================================================

export const STORAGE_CONFIG = {
  /** S3 endpoint */
  endpoint: process.env.S3_ENDPOINT || "",
  
  /** S3 access key */
  accessKey: process.env.S3_ACCESS_KEY || "",
  
  /** S3 secret key */
  secretKey: process.env.S3_SECRET_KEY || "",
  
  /** S3 bucket name */
  bucket: process.env.S3_BUCKET || "orderflow",
  
  /** S3 region */
  region: process.env.S3_REGION || "us-east-1",
} as const;

// ============================================================
// Business Defaults
// ============================================================

export const BUSINESS_DEFAULTS = {
  /** Default country */
  country: "NG",
  
  /** Default currency */
  currency: "NGN",
  
  /** Default timezone */
  timezone: "Africa/Lagos",
  
  /** Default tax rate (percentage) */
  taxRate: 0,
  
  /** Default delivery fee */
  deliveryFee: 0,
} as const;

// ============================================================
// Order Configuration
// ============================================================

export const ORDER_CONFIG = {
  /** Order number prefix */
  prefix: "ORD",
  
  /** Order number padding */
  padding: 4,
  
  /** Valid status transitions */
  validTransitions: {
    DRAFT: ["PENDING_CONFIRMATION", "CANCELLED"],
    PENDING_CONFIRMATION: ["PENDING_PAYMENT", "CANCELLED"],
    PENDING_PAYMENT: ["PAID", "CANCELLED"],
    PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
    PROCESSING: ["READY_FOR_FULFILLMENT", "CANCELLED"],
    READY_FOR_FULFILLMENT: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["COMPLETED", "FAILED"],
    COMPLETED: ["REFUNDED"],
    CANCELLED: [],
    REFUNDED: [],
    FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  } as Record<string, string[]>,
} as const;

// ============================================================
// App Configuration
// ============================================================

export const APP_CONFIG = {
  /** App name */
  name: "OrderFlow",
  
  /** App URL */
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  /** API URL */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  
  /** Environment */
  environment: process.env.NODE_ENV || "development",
  
  /** Is development */
  isDev: process.env.NODE_ENV === "development",
  
  /** Is production */
  isProd: process.env.NODE_ENV === "production",
} as const;
