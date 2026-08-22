import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  AIProvider,
  IntentSchema,
  IntentClassification,
  OrderExtractionSchema,
  OrderExtraction,
  OrderContext,
  Product,
  ProductMatch,
  ReplyContext,
  Message,
} from "./base";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private model: string;

  constructor(model: string = "gpt-4o-mini") {
    this.model = model;
  }

  async classifyIntent(input: string): Promise<IntentClassification> {
    const { object } = await generateObject({
      model: openai(this.model),
      schema: IntentSchema,
      prompt: `Classify the intent of this customer message. Consider the context of a business ordering system.

Customer message: "${input}"

Possible intents:
- CREATE_ORDER: Customer wants to place an order
- MODIFY_ORDER: Customer wants to change an existing order
- CANCEL_ORDER: Customer wants to cancel an order
- CHECK_ORDER_STATUS: Customer wants to know order status
- INQUIRE_PRODUCT: Customer is asking about products
- CHECK_INVENTORY: Customer wants to know stock availability
- GENERAL_INQUIRY: General question
- GREETING: Simple greeting
- THANK_YOU: Expressing gratitude
- COMPLAINT: Customer is unhappy
- UNKNOWN: Cannot determine intent`,
    });

    return object;
  }

  async extractOrder(
    input: string,
    context: OrderContext
  ): Promise<OrderExtraction> {
    const productContext = context.availableProducts
      ? `\nAvailable products:\n${context.availableProducts.map((p) => `- ${p.name} (${p.sku || "no SKU"}) - ${p.unit}`).join("\n")}`
      : "";

    const { object } = await generateObject({
      model: openai(this.model),
      schema: OrderExtractionSchema,
      prompt: `Extract order details from this customer message. The customer wants to create an order.

Customer message: "${input}"
${productContext}

Extract:
- items: List of products with quantities (use product_query for fuzzy matching)
- deliveryDate: When they want delivery (if specified)
- deliveryAddress: Where to deliver (if specified)
- notes: Any additional notes
- confidence: How confident you are in the extraction (0-1)
- missingInfo: What information is missing or unclear`,
    });

    return object;
  }

  async resolveProduct(
    query: string,
    products: Product[]
  ): Promise<ProductMatch[]> {
    // Simple fuzzy matching based on string similarity
    const matches: ProductMatch[] = [];

    for (const product of products) {
      const score = this.calculateSimilarity(query, product.name);
      const aliasScore = product.aliases.reduce((max, alias) => {
        return Math.max(max, this.calculateSimilarity(query, alias));
      }, 0);

      const bestScore = Math.max(score, aliasScore);

      if (bestScore > 0.3) {
        matches.push({
          product,
          score: bestScore,
          confidence:
            bestScore > 0.7 ? "high" : bestScore > 0.5 ? "medium" : "low",
          reason:
            bestScore > 0.7
              ? "Strong match"
              : bestScore > 0.5
                ? "Partial match"
                : "Weak match",
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  async generateReply(context: ReplyContext): Promise<string> {
    const { object } = await generateObject({
      model: openai(this.model),
      schema: { type: "object", properties: { reply: { type: "string" } } },
      prompt: `Generate a friendly, professional reply for this business conversation.

Context:
- Intent: ${context.intent}
- Customer name: ${context.customerName || "Customer"}
- Business name: ${context.businessName || "Business"}
- Currency: ${context.currency || "NGN"}

${context.order ? `Order details:
- Items: ${context.order.items.map((i) => `${i.quantity} ${i.unit || "units"} of ${i.productQuery}`).join(", ")}
- Delivery date: ${context.order.deliveryDate || "Not specified"}
- Missing info: ${context.order.missingInfo?.join(", ") || "None"}` : ""}

${context.matchedProducts ? `Matched products with prices:
${context.matchedProducts.map((m) => `- ${m.product.name}: ${m.quantity} ${m.product.unit} @ ${context.currency || "NGN"} ${m.price} = ${context.currency || "NGN"} ${m.price * m.quantity}`).join("\n")}` : ""}

Generate a natural, helpful response. If asking for clarification, be specific about what's needed.`,
    });

    return object.reply;
  }

  async summarizeConversation(messages: Message[]): Promise<string> {
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const { object } = await generateObject({
      model: openai(this.model),
      schema: { type: "object", properties: { summary: { type: "string" } } },
      prompt: `Summarize this customer conversation concisely:

${conversationText}

Provide a brief summary of:
1. What the customer wants
2. Any orders discussed
3. Current status
4. Next steps`,
    });

    return object.summary;
  }

  // Simple string similarity calculation
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const intersection = words1.filter((w) => words2.includes(w));
    const union = new Set([...words1, ...words2]);

    return intersection.length / union.size;
  }
}
