import {
  AIProvider,
  IntentClassification,
  OrderExtraction,
  OrderContext,
  Product,
  ProductMatch,
  ReplyContext,
  Message,
} from "./base";

export class MockProvider implements AIProvider {
  name = "mock";

  async classifyIntent(input: string): Promise<IntentClassification> {
    // Simple keyword-based intent classification for development
    const lowerInput = input.toLowerCase();

    if (lowerInput.match(/\b(order|buy|purchase|get|need|want)\b.*\b(rice|malt|oil|water|egg|noodle)\b/)) {
      return {
        intent: "CREATE_ORDER",
        confidence: 0.9,
      };
    }

    if (lowerInput.match(/\b(status|where|track|track|delivery|deliver)\b/)) {
      return {
        intent: "CHECK_ORDER_STATUS",
        confidence: 0.8,
      };
    }

    if (lowerInput.match(/\b(cancel|stop|delete)\b/)) {
      return {
        intent: "CANCEL_ORDER",
        confidence: 0.8,
      };
    }

    if (lowerInput.match(/\b(price|cost|how much|expensive|cheap)\b/)) {
      return {
        intent: "INQUIRE_PRODUCT",
        confidence: 0.7,
      };
    }

    if (lowerInput.match(/\b(hello|hi|hey|good morning|good afternoon)\b/)) {
      return {
        intent: "GREETING",
        confidence: 0.95,
      };
    }

    if (lowerInput.match(/\b(thank|thanks|appreciate)\b/)) {
      return {
        intent: "THANK_YOU",
        confidence: 0.95,
      };
    }

    return {
      intent: "UNKNOWN",
      confidence: 0.3,
    };
  }

  async extractOrder(
    input: string,
    context: OrderContext
  ): Promise<OrderExtraction> {
    // Simple extraction for development
    const items: Array<{ productQuery: string; quantity: number; unit?: string }> = [];

    // Match patterns like "20 malt" or "5 bags of rice"
    const patterns = [
      /(\d+)\s+(?:cartons?\s+of\s+)?(malt|malta|guinness)/gi,
      /(\d+)\s+(?:bags?\s+of\s+)?(rice)/gi,
      /(\d+)\s+(?:liters?\s+of\s+)?(oil|vegetable\s+oil)/gi,
      /(\d+)\s+(?:crates?\s+of\s+)?(egg|eggs)/gi,
      /(\d+)\s+(?:packs?\s+of\s+)?(noodle|noodles|indomie)/gi,
      /(\d+)\s+(?:bottles?\s+of\s+)?(water|coke|cola|fanta)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        items.push({
          productQuery: match[2],
          quantity: parseInt(match[1]),
        });
      }
    }

    // Extract delivery date
    let deliveryDate: string | undefined;
    if (input.toLowerCase().includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deliveryDate = tomorrow.toISOString().split("T")[0];
    } else if (input.toLowerCase().includes("today")) {
      deliveryDate = new Date().toISOString().split("T")[0];
    }

    return {
      intent: "CREATE_ORDER",
      items,
      deliveryDate,
      confidence: items.length > 0 ? 0.8 : 0.3,
      missingInfo: items.length === 0 ? ["products"] : [],
    };
  }

  async resolveProduct(
    query: string,
    products: Product[]
  ): Promise<ProductMatch[]> {
    // Simple fuzzy matching
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
    const { intent, order, matchedProducts, customerName, currency } = context;

    switch (intent) {
      case "CREATE_ORDER":
        if (order?.missingInfo && order.missingInfo.length > 0) {
          return `Hello ${customerName || "there"}! I'd be happy to help you place an order. Could you please tell me which products you'd like to order and the quantities?`;
        }
        if (matchedProducts && matchedProducts.length > 0) {
          const itemsList = matchedProducts
            .map(
              (m) =>
                `${m.quantity} ${m.product.unit} of ${m.product.name} - ${currency || "NGN"} ${(m.price * m.quantity).toLocaleString()}`
            )
            .join("\n");
          const total = matchedProducts.reduce(
            (sum, m) => sum + m.price * m.quantity,
            0
          );
          return `Great! Here's your order summary:\n\n${itemsList}\n\nTotal: ${currency || "NGN"} ${total.toLocaleString()}\n\nWould you like to proceed with this order?`;
        }
        return `Hello ${customerName || "there"}! What would you like to order today?`;

      case "CHECK_ORDER_STATUS":
        return `I'd be happy to help you check your order status. Let me look that up for you.`;

      case "GREETING":
        return `Hello ${customerName || "there"}! Welcome to ${context.businessName || "our store"}. How can I help you today?`;

      case "THANK_YOU":
        return `You're welcome, ${customerName || "there"}! Is there anything else I can help you with?`;

      default:
        return `I'm here to help you with your order. What would you like to do?`;
    }
  }

  async summarizeConversation(messages: Message[]): Promise<string> {
    const userMessages = messages.filter((m) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];

    return lastUserMessage
      ? `Customer last said: "${lastUserMessage.content}"`
      : "No messages yet.";
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
