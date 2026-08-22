import { z } from "zod";

// Payment Provider Interface
export interface PaymentProvider {
  name: string;

  // Initialize a payment transaction
  initializeTransaction(params: InitializeParams): Promise<InitializeResult>;

  // Verify a transaction
  verifyTransaction(reference: string): Promise<VerifyResult>;

  // Process a refund
  refundTransaction(reference: string, amount?: number): Promise<RefundResult>;

  // Handle webhook payload
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Input schemas
export const InitializeParamsSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("NGN"),
  reference: z.string().optional(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

export type InitializeParams = z.infer<typeof InitializeParamsSchema>;

// Output schemas
export interface InitializeResult {
  success: boolean;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: Date;
  customer?: {
    email: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  reference: string;
  amount?: number;
  status: string;
  error?: string;
}

// Webhook event
export interface WebhookEvent {
  type: "charge.success" | "charge.failed" | "refund.created" | "refund.failed";
  reference: string;
  data: Record<string, unknown>;
}

// Payment initialization schema
export const PaymentInitSchema = z.object({
  orderId: z.string(),
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("NGN"),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

export type PaymentInit = z.infer<typeof PaymentInitSchema>;

// Payment verification schema
export const PaymentVerifySchema = z.object({
  reference: z.string(),
});

export type PaymentVerify = z.infer<typeof PaymentVerifySchema>;

// Refund schema
export const RefundSchema = z.object({
  reference: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export type Refund = z.infer<typeof RefundSchema>;
