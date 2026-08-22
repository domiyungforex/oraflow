import { generateObject } from "ai";
import { z } from "zod";
import { MockProvider } from "@orderflow/ai";

/**
 * Schema for extracted order items.
 */
const OrderItemSchema = z.object({
  productQuery: z.string().describe("The product name or description as mentioned by the customer"),
  quantity: z.number().int().positive().describe("The quantity requested"),
  unit: z.string().optional().describe("The unit (e.g., carton, bag, keg, pack)"),
});

/**
 * Schema for order extraction result.
 */
const ExtractionResultSchema = z.object({
  intent: z.enum([
    "CREATE_ORDER",
    "MODIFY_ORDER",
    "CANCEL_ORDER",
    "CHECK_STATUS",
    "INQUIRE_PRODUCT",
    "GREETING",
    "GENERAL",
  ]),
  items: z.array(OrderItemSchema).describe("Extracted order items"),
  deliveryDate: z.string().optional().describe("Delivery date if mentioned (YYYY-MM-DD)"),
  deliveryAddress: z.string().optional().describe("Delivery address if mentioned"),
  notes: z.string().optional().describe("Any additional notes from the customer"),
  confidence: z.number().min(0).max(1).describe("Overall confidence in extraction"),
  missingInfo: z.array(z.string()).describe("What information is missing"),
  responseHint: z.string().optional().describe("Suggested response to the customer"),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * AI-powered order extraction from natural language messages.
 */
export class OrderExtractor {
  private model: string;
  private useMock: boolean;

  constructor(config?: { model?: string; useMock?: boolean }) {
    this.model = config?.model || "gpt-4o-mini";
    this.useMock = config?.useMock ?? (process.env.NODE_ENV !== "production");
  }

  /**
   * Extract order details from a customer message.
   */
  async extract(
    message: string,
    context: {
      availableProducts?: Array<{ name: string; aliases: string[]; unit: string }>;
      customerName?: string;
      businessName?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    }
  ): Promise<ExtractionResult> {
    if (this.useMock) {
      return this.mockExtract(message, context);
    }

    const productContext = context.availableProducts
      ? `\n\nAvailable products in the store:\n${context.availableProducts.map((p) => `- ${p.name} (${p.unit}) - Aliases: ${p.aliases.join(", ")}`).join("\n")}`
      : "";

    const historyContext = context.conversationHistory
      ? `\n\nRecent conversation:\n${context.conversationHistory.slice(-5).map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "";

    const prompt = `You are an AI assistant helping process customer orders for a business.

Analyze the following customer message and extract order information.

Customer message: "${message}"
${productContext}
${historyContext}

Extract:
1. Intent - What does the customer want?
2. Items - Products and quantities (use product_query for fuzzy matching)
3. Delivery date - When they want delivery
4. Delivery address - Where to deliver
5. Notes - Any additional information
6. Confidence - How confident you are (0-1)
7. Missing info - What's still needed to complete the order

Important rules:
- If the customer just says "malt" or "rice", treat it as a product query
- Common abbreviations: "malt" = Malta Guinness, "rice" = Premium Rice
- If quantity is not specified, mark it as missing
- If delivery date is not specified, mark it as missing
- Be generous with fuzzy matching - "20 malt" means 20 cartons of Malta Guinness
- Units: carton, bag, keg, pack, crate, tin, piece`;

    try {
      const { object } = await generateObject({
        model: this.getModel(),
        schema: ExtractionResultSchema,
        prompt,
      });

      return object;
    } catch (error) {
      console.error("AI extraction failed, falling back to mock:", error);
      return this.mockExtract(message, context);
    }
  }

  /**
   * Classify the intent of a message.
   */
  async classifyIntent(message: string): Promise<ExtractionResult["intent"]> {
    if (this.useMock) {
      return this.mockClassifyIntent(message);
    }

    try {
      const result = await this.extract(message, {});
      return result.intent;
    } catch {
      return "GENERAL";
    }
  }

  /**
   * Generate a response to the customer.
   */
  async generateResponse(context: {
    intent: string;
    customerName?: string;
    businessName?: string;
    pendingItems?: Array<{ productName: string; quantity: number; unitPrice: number; unit: string }>;
    missingInfo?: string[];
    orderTotal?: number;
    currency?: string;
    state?: string;
  }): Promise<string> {
    if (this.useMock) {
      return this.mockGenerateResponse(context);
    }

    const prompt = `Generate a friendly, professional response for this business conversation.

Context:
- Intent: ${context.intent}
- Customer name: ${context.customerName || "Customer"}
- Business name: ${context.businessName || "Business"}
- Conversation state: ${context.state || "IDLE"}
- Currency: ${context.currency || "NGN"}

${context.pendingItems && context.pendingItems.length > 0 ? `Current order items:
${context.pendingItems.map((i) => `- ${i.quantity} ${i.unit} of ${i.productName} @ ${context.currency || "NGN"} ${i.unitPrice.toLocaleString()} = ${context.currency || "NGN"} ${(i.quantity * i.unitPrice).toLocaleString()}`).join("\n")}

Order total: ${context.currency || "NGN"} ${(context.orderTotal || 0).toLocaleString()}` : ""}

${context.missingInfo && context.missingInfo.length > 0 ? `Missing information: ${context.missingInfo.join(", ")}` : ""}

Generate a natural, helpful response. Be concise but friendly.`;

    try {
      const { object } = await generateObject({
        model: this.getModel(),
        schema: z.object({ reply: z.string() }),
        prompt,
      });

      return object.reply;
    } catch (error) {
      console.error("AI response generation failed:", error);
      return this.mockGenerateResponse(context);
    }
  }

  // Private helper methods

  private getModel() {
    // This would return the appropriate AI model based on config
    // For now, return a mock
    return "gpt-4o-mini";
  }

  private mockExtract(
    message: string,
    context: {
      availableProducts?: Array<{ name: string; aliases: string[]; unit: string }>;
    }
  ): ExtractionResult {
    const lowerMessage = message.toLowerCase();
    const items: Array<{ productQuery: string; quantity: number; unit?: string }> = [];

    // Pattern matching for common Nigerian business products
    const patterns = [
      { regex: /(\d+)\s*(?:cartons?\s*(?:of\s*)?)?malt(?:a)?(?:\s*guinness)?/gi, query: "malt", unit: "carton" },
      { regex: /(\d+)\s*(?:bags?\s*(?:of\s*)?)?rice/gi, query: "rice", unit: "bag" },
      { regex: /(\d+)\s*(?:liters?\s*(?:of\s*)?)?(?:vegetable\s*)?oil/gi, query: "oil", unit: "keg" },
      { regex: /(\d+)\s*(?:crates?\s*(?:of\s*)?)?eggs?/gi, query: "eggs", unit: "crate" },
      { regex: /(\d+)\s*(?:packs?\s*(?:of\s*)?)?(?:noodles?|indomie)/gi, query: "indomie", unit: "pack" },
      { regex: /(\d+)\s*(?:bottles?\s*(?:of\s*)?)?(?:water|coke|fanta|cola)/gi, query: "water", unit: "bottle" },
      { regex: /(\d+)\s*(?:tins?\s*(?:of\s*)?)?(?:tomato|paste)/gi, query: "tomato paste", unit: "tin" },
      { regex: /(\d+)\s*(?:tins?\s*(?:of\s*)?)?milk/gi, query: "milk", unit: "tin" },
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(lowerMessage)) !== null) {
        items.push({
          productQuery: pattern.query,
          quantity: parseInt(match[1]),
          unit: pattern.unit,
        });
      }
    }

    // Determine intent
    let intent: ExtractionResult["intent"] = "GENERAL";
    if (items.length > 0) intent = "CREATE_ORDER";
    else if (lowerMessage.match(/\b(cancel|stop|delete)\b/)) intent = "CANCEL_ORDER";
    else if (lowerMessage.match(/\b(status|where|track|track|delivery)\b/)) intent = "CHECK_STATUS";
    else if (lowerMessage.match(/\b(price|cost|how much|expensive)\b/)) intent = "INQUIRE_PRODUCT";
    else if (lowerMessage.match(/\b(hello|hi|hey|good\s*(morning|afternoon|evening))\b/)) intent = "GREETING";

    // Extract delivery date
    let deliveryDate: string | undefined;
    if (lowerMessage.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deliveryDate = tomorrow.toISOString().split("T")[0];
    } else if (lowerMessage.includes("today")) {
      deliveryDate = new Date().toISOString().split("T")[0];
    }

    // Determine missing info
    const missingInfo: string[] = [];
    if (items.length === 0) missingInfo.push("products");
    if (items.some((i) => !i.quantity)) missingInfo.push("quantities");
    if (!deliveryDate) missingInfo.push("delivery date");

    return {
      intent,
      items,
      deliveryDate,
      confidence: items.length > 0 ? 0.8 : 0.3,
      missingInfo,
      responseHint: items.length > 0 ? "Ask for confirmation" : "Ask what they want to order",
    };
  }

  private mockClassifyIntent(message: string): ExtractionResult["intent"] {
    const lower = message.toLowerCase();
    if (lower.match(/\b(order|buy|purchase|get|need|want)\b/)) return "CREATE_ORDER";
    if (lower.match(/\b(cancel|stop)\b/)) return "CANCEL_ORDER";
    if (lower.match(/\b(status|where|track)\b/)) return "CHECK_STATUS";
    if (lower.match(/\b(price|cost|how much)\b/)) return "INQUIRE_PRODUCT";
    if (lower.match(/\b(hello|hi|hey)\b/)) return "GREETING";
    return "GENERAL";
  }

  private mockGenerateResponse(context: {
    intent: string;
    customerName?: string;
    pendingItems?: Array<{ productName: string; quantity: number; unitPrice: number; unit: string }>;
    missingInfo?: string[];
    orderTotal?: number;
    state?: string;
  }): string {
    const name = context.customerName || "there";

    if (context.intent === "GREETING") {
      return `Hello ${name}! How can I help you today?`;
    }

    if (context.intent === "CHECK_STATUS") {
      return `Let me check that for you, ${name}. Could you please provide your order number?`;
    }

    if (context.intent === "INQUIRE_PRODUCT") {
      return `I'd be happy to help you with pricing, ${name}. What product are you interested in?`;
    }

    if (context.missingInfo && context.missingInfo.length > 0) {
      if (context.missingInfo.includes("products")) {
        return `Hello ${name}! What would you like to order today?`;
      }
      if (context.missingInfo.includes("delivery date")) {
        return `Great choices! When would you like these delivered?`;
      }
    }

    if (context.pendingItems && context.pendingItems.length > 0) {
      const itemsList = context.pendingItems
        .map((i) => `${i.quantity} ${i.unit} of ${i.productName}`)
        .join(", ");

      return `I have your order for ${itemsList}. The total is ₦${(context.orderTotal || 0).toLocaleString()}. Would you like to proceed?`;
    }

    return `I'm here to help, ${name}. How can I assist you?`;
  }
}

export const orderExtractor = new OrderExtractor();
