import {
  PaymentProvider,
  InitializeParams,
  InitializeResult,
  VerifyResult,
  RefundResult,
  WebhookEvent,
} from "./base";

export class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  private transactions: Map<string, InitializeParams> = new Map();

  async initializeTransaction(params: InitializeParams): Promise<InitializeResult> {
    const reference = params.reference || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store transaction
    this.transactions.set(reference, params);

    // Generate mock authorization URL
    const authorizationUrl = `http://localhost:3001/mock-payment?reference=${reference}&amount=${params.amount}`;

    return {
      success: true,
      reference,
      authorizationUrl,
      accessCode: `mock_access_${reference}`,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    const params = this.transactions.get(reference);

    if (!params) {
      return {
        success: false,
        reference,
        amount: 0,
        currency: "NGN",
        status: "failed",
        error: "Transaction not found",
      };
    }

    // Simulate successful verification
    return {
      success: true,
      reference,
      amount: params.amount,
      currency: params.currency,
      status: "success",
      paidAt: new Date(),
      customer: {
        email: params.email,
      },
      metadata: params.metadata,
    };
  }

  async refundTransaction(reference: string, amount?: number): Promise<RefundResult> {
    const params = this.transactions.get(reference);

    if (!params) {
      return {
        success: false,
        reference,
        status: "failed",
        error: "Transaction not found",
      };
    }

    // Simulate successful refund
    return {
      success: true,
      reference,
      amount: amount || params.amount,
      status: "refunded",
    };
  }

  async handleWebhook(
    payload: Record<string, unknown>,
    signature: string
  ): Promise<WebhookEvent> {
    // Mock webhook handling
    const event = payload as { event: string; data: Record<string, unknown> };

    return {
      type: event.event as WebhookEvent["type"],
      reference: (event.data?.reference as string) || "",
      data: event.data || {},
    };
  }

  // Helper method to simulate payment completion
  async simulatePaymentComplete(reference: string): Promise<void> {
    // This would be called by the mock payment page
    // In real implementation, this would trigger the webhook
    console.log(`[Mock] Payment completed for reference: ${reference}`);
  }
}
