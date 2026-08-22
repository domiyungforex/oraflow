import { z } from "zod";

// AI Provider Interface
export interface AIProvider {
  name: string;
  
  // Core capabilities
  classifyIntent(input: string): Promise<IntentClassification>;
  extractOrder(input: string, context: OrderContext): Promise<OrderExtraction>;
  resolveProduct(query: string, products: Product[]): Promise<ProductMatch[]>;
  generateReply(context: ReplyContext): Promise<string>;
  summarizeConversation(messages: Message[]): Promise<string>;
}

// Intent Classification
export const IntentSchema = z.object({
  intent: z.enum([
    "CREATE_ORDER",
    "MODIFY_ORDER",
    "CANCEL_ORDER",
    "CHECK_ORDER_STATUS",
    "INQUIRE_PRODUCT",
    "CHECK_INVENTORY",
    "GENERAL_INQUIRY",
    "GREETING",
    "THANK_YOU",
    "COMPLAINT",
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string()).optional(),
});

export type IntentClassification = z.infer<typeof IntentSchema>;

// Order Context for extraction
export interface OrderContext {
  businessId: string;
  customerId?: string;
  conversationHistory?: Message[];
  availableProducts?: Product[];
  customerSegment?: string;
}

// Order Extraction Result
export const OrderItemSchema = z.object({
  productQuery: z.string(),
  quantity: z.number().int().positive(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const OrderExtractionSchema = z.object({
  intent: z.literal("CREATE_ORDER"),
  items: z.array(OrderItemSchema).min(1),
  deliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
  missingInfo: z.array(z.string()).optional(),
});

export type OrderExtraction = z.infer<typeof OrderExtractionSchema>;

// Product for matching
export interface Product {
  id: string;
  name: string;
  aliases: string[];
  sku?: string;
  price: number;
  unit: string;
  category?: string;
}

// Product Match Result
export interface ProductMatch {
  product: Product;
  score: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// Reply Context
export interface ReplyContext {
  intent: string;
  order?: OrderExtraction;
  matchedProducts?: Array<{ product: Product; quantity: number; price: number }>;
  customerName?: string;
  businessName?: string;
  currency?: string;
  conversationHistory?: Message[];
}

// Message type
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

// AI Service class
export class AIService {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async classifyIntent(input: string): Promise<IntentClassification> {
    return this.provider.classifyIntent(input);
  }

  async extractOrder(
    input: string,
    context: OrderContext
  ): Promise<OrderExtraction> {
    return this.provider.extractOrder(input, context);
  }

  async resolveProduct(
    query: string,
    products: Product[]
  ): Promise<ProductMatch[]> {
    return this.provider.resolveProduct(query, products);
  }

  async generateReply(context: ReplyContext): Promise<string> {
    return this.provider.generateReply(context);
  }

  async summarizeConversation(messages: Message[]): Promise<string> {
    return this.provider.summarizeConversation(messages);
  }
}

// Export provider types and implementations
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";
export { MockProvider } from "./mock";
