import crypto from "crypto";
import {
  PaymentProvider,
  InitializeParams,
  InitializeResult,
  VerifyResult,
  RefundResult,
  WebhookEvent,
} from "./base";

/**
 * Real Paystack Payment Provider
 * Uses Paystack's API for actual payment processing
 */
export class PaystackProvider implements PaymentProvider {
  name = "paystack";
  private secretKey: string;
  private publicKey: string;
  private baseUrl = "https://api.paystack.co";

  constructor(config?: { secretKey?: string; publicKey?: string }) {
    this.secretKey = config?.secretKey || process.env.PAYSTACK_SECRET_KEY || "";
    this.publicKey = config?.publicKey || process.env.PAYSTACK_PUBLIC_KEY || "";
  }

  /**
   * Check if real Paystack credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.secretKey && this.publicKey);
  }

  /**
   * Make authenticated request to Paystack API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Paystack API error");
    }

    return data.data;
  }

  /**
   * Initialize a Paystack transaction
   */
  async initializeTransaction(params: InitializeParams): Promise<InitializeResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        reference: "",
        error: "Paystack credentials not configured",
      };
    }

    try {
      const reference = params.reference || `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const data = await this.request<any>("POST", "/transaction/initialize", {
        email: params.email,
        amount: Math.round(params.amount * 100), // Paystack uses kobo
        currency: params.currency,
        reference,
        callback_url: params.callbackUrl,
        metadata: {
          ...params.metadata,
          reference,
        },
      });

      return {
        success: true,
        reference: data.reference,
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
      };
    } catch (error) {
      console.error("Paystack initialize error:", error);
      return {
        success: false,
        reference: params.reference || "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify a Paystack transaction
   */
  async verifyTransaction(reference: string): Promise<VerifyResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        error: "Paystack credentials not configured",
      };
    }

    try {
      const data = await this.request<any>(
        "GET",
        `/transaction/verify/${reference}`
      );

      return {
        success: data.status === "success",
        reference: data.reference,
        amount: data.amount / 100, // Convert from kobo to naira
        currency: data.currency,
        status: data.status,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
        customer: data.customer
          ? {
              email: data.customer.email,
              name: data.customer.first_name
                ? `${data.customer.first_name} ${data.customer.last_name || ""}`.trim()
                : undefined,
            }
          : undefined,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error("Paystack verify error:", error);
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process a refund via Paystack
   */
  async refundTransaction(
    reference: string,
    amount?: number
  ): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        reference,
        status: "failed",
        error: "Paystack credentials not configured",
      };
    }

    try {
      const body: any = { transaction: reference };

      if (amount) {
        body.amount = Math.round(amount * 100); // Convert to kobo
      }

      const data = await this.request<any>("POST", "/refund", body);

      return {
        success: true,
        reference,
        amount: data.amount ? data.amount / 100 : undefined,
        status: data.status,
      };
    } catch (error) {
      console.error("Paystack refund error:", error);
      return {
        success: false,
        reference,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle Paystack webhook payload
   */
  async handleWebhook(
    payload: unknown,
    signature: string
  ): Promise<WebhookEvent> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new Error("Invalid webhook signature");
    }

    const data = payload as any;

    const eventMap: Record<string, WebhookEvent["type"]> = {
      "charge.success": "charge.success",
      "charge.failed": "charge.failed",
      "refund.created": "refund.created",
      "refund.failed": "refund.failed",
    };

    const eventType = eventMap[data.event];

    if (!eventType) {
      throw new Error(`Unknown webhook event: ${data.event}`);
    }

    return {
      type: eventType,
      reference: data.data?.reference || "",
      data: data.data || {},
    };
  }

  /**
   * Verify Paystack webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac("sha512", this.secretKey)
        .update(body)
        .digest("base64");

      return signature === expectedSignature;
    } catch (error) {
      console.error("Webhook signature verification error:", error);
      return false;
    }
  }
}
