import { z } from "zod";

// Messaging Provider Interface
export interface MessagingProvider {
  name: string;

  // Send a text message
  sendText(params: SendTextParams): Promise<SendResult>;

  // Send a template message
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;

  // Send an image
  sendImage(params: SendImageParams): Promise<SendResult>;

  // Send a document
  sendDocument(params: SendDocumentParams): Promise<SendResult>;

  // Verify webhook signature
  verifyWebhook(signature: string, body: string): boolean;
}

// Input schemas
export const SendTextParamsSchema = z.object({
  to: z.string(),
  text: z.string(),
  previewUrl: z.boolean().optional(),
});

export type SendTextParams = z.infer<typeof SendTextParamsSchema>;

export const SendTemplateParamsSchema = z.object({
  to: z.string(),
  template: z.string(),
  language: z.string().default("en_US"),
  components: z.array(z.object({
    type: z.string(),
    parameters: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    })).optional(),
  })).optional(),
});

export type SendTemplateParams = z.infer<typeof SendTemplateParamsSchema>;

export const SendImageParamsSchema = z.object({
  to: z.string(),
  imageUrl: z.string().url(),
  caption: z.string().optional(),
});

export type SendImageParams = z.infer<typeof SendImageParamsSchema>;

export const SendDocumentParamsSchema = z.object({
  to: z.string(),
  documentUrl: z.string().url(),
  filename: z.string(),
  caption: z.string().optional(),
});

export type SendDocumentParams = z.infer<typeof SendDocumentParamsSchema>;

// Output schemas
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Message templates
export const MESSAGE_TEMPLATES = {
  ORDER_CONFIRMATION: "order_confirmation",
  PAYMENT_REQUEST: "payment_request",
  PAYMENT_RECEIVED: "payment_received",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  LOW_STOCK: "low_stock",
} as const;

export type MessageTemplate = (typeof MESSAGE_TEMPLATES)[keyof typeof MESSAGE_TEMPLATES];
