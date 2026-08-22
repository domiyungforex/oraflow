// AI Abstraction Layer for OrderFlow
export { AIService } from "./providers/base";
export { AnthropicProvider } from "./providers/anthropic";
export { OpenAIProvider } from "./providers/openai";
export { MockProvider } from "./providers/mock";
export type {
  AIProvider,
  IntentClassification,
  OrderExtraction,
  OrderContext,
  Product,
  ProductMatch,
  ReplyContext,
  Message,
} from "./providers/base";
export { IntentSchema, OrderExtractionSchema } from "./providers/base";
