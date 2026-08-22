import crypto from "crypto";
import {
  MessagingProvider,
  SendTextParams,
  SendTemplateParams,
  SendImageParams,
  SendDocumentParams,
  SendResult,
} from "./base";

/**
 * Real WhatsApp Business Cloud API Provider
 * Uses Facebook's WhatsApp Cloud API for actual message delivery
 */
export class WhatsAppProvider implements MessagingProvider {
  name = "whatsapp";
  private accessToken: string;
  private phoneNumberId: string;
  private appSecret: string;
  private apiVersion = "v18.0";

  constructor(config?: {
    accessToken?: string;
    phoneNumberId?: string;
    appSecret?: string;
  }) {
    this.accessToken = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.appSecret = config?.appSecret || process.env.WHATSAPP_APP_SECRET || "";
  }

  /**
   * Check if real WhatsApp credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId && this.appSecret);
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendText(params: SendTextParams): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: params.to,
            type: "text",
            text: {
              body: params.text,
              preview_url: params.previewUrl || false,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp API error:", data);
        return {
          success: false,
          error: data.error?.message || "Failed to send WhatsApp message",
        };
      }

      const messageId = data.messages?.[0]?.id;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error("WhatsApp send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send a template message via WhatsApp Cloud API
   */
  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    try {
      const template: any = {
        name: params.template,
        language: {
          code: params.language,
        },
      };

      if (params.components && params.components.length > 0) {
        template.components = params.components.map((comp) => ({
          type: comp.type,
          parameters: comp.parameters?.map((param) => ({
            type: param.type,
            text: param.text,
          })),
        }));
      }

      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: params.to,
            type: "template",
            template,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp template error:", data);
        return {
          success: false,
          error: data.error?.message || "Failed to send WhatsApp template",
        };
      }

      const messageId = data.messages?.[0]?.id;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error("WhatsApp template error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send an image via WhatsApp Cloud API
   */
  async sendImage(params: SendImageParams): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    try {
      const image: any = {
        link: params.imageUrl,
      };

      if (params.caption) {
        image.caption = params.caption;
      }

      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: params.to,
            type: "image",
            image,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Failed to send WhatsApp image",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send a document via WhatsApp Cloud API
   */
  async sendDocument(params: SendDocumentParams): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    try {
      const document: any = {
        link: params.documentUrl,
        filename: params.filename,
      };

      if (params.caption) {
        document.caption = params.caption;
      }

      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: params.to,
            type: "document",
            document,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Failed to send WhatsApp document",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify WhatsApp webhook signature
   */
  verifyWebhook(signature: string, body: string): boolean {
    if (!this.appSecret) {
      console.warn("WhatsApp app secret not configured, skipping verification");
      return false;
    }

    try {
      const expectedSignature =
        "sha256=" +
        crypto.createHmac("sha256", this.appSecret).update(body).digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Webhook verification error:", error);
      return false;
    }
  }

  /**
   * Parse incoming WhatsApp webhook payload
   */
  parseIncomingMessage(payload: any): {
    phone: string;
    messageId: string;
    timestamp: string;
    type: string;
    text?: string;
    image?: { id: string; mimeType: string; caption?: string };
    contacts?: Array<{ waId: string; profile: { name: string } }>;
  } | null {
    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];

      if (!changes || changes.field !== "messages") {
        return null;
      }

      const value = changes.value;
      const message = value.messages?.[0];

      if (!message) {
        return null;
      }

      const result: any = {
        phone: message.from,
        messageId: message.id,
        timestamp: message.timestamp,
        type: message.type,
        contacts: value.contacts,
      };

      if (message.type === "text") {
        result.text = message.text?.body;
      } else if (message.type === "image") {
        result.image = {
          id: message.image.id,
          mimeType: message.image.mime_type,
          caption: message.image.caption,
        };
      }

      return result;
    } catch (error) {
      console.error("Parse incoming message error:", error);
      return null;
    }
  }
}
