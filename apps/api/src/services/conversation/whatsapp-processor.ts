import crypto from "crypto";
import { db, withTenant } from "@orderflow/db";
import { conversationEngine, ProcessMessageResult } from "./engine";

/**
 * Process incoming WhatsApp webhook events.
 */
export class WhatsAppProcessor {
  private accessToken: string;
  private phoneNumberId: string;
  private appSecret: string;

  constructor(config: {
    accessToken: string;
    phoneNumberId: string;
    appSecret: string;
  }) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.appSecret = config.appSecret;
  }

  /**
   * Verify webhook signature.
   */
  verifySignature(body: string, signature: string): boolean {
    if (!this.appSecret) {
      console.warn("WhatsApp app secret not configured, skipping verification");
      return true;
    }

    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", this.appSecret)
        .update(body)
        .digest("hex");

    return signature === expectedSignature;
  }

  /**
   * Process incoming webhook payload.
   */
  async processWebhook(payload: {
    entry?: Array<{
      changes?: Array<{
        value: {
          messaging_product: string;
          metadata: {
            display_phone_number: string;
            phone_number_id: string;
          };
          contacts?: Array<{
            wa_id: string;
            profile: { name: string };
          }>;
          messages?: Array<{
            from: string;
            id: string;
            timestamp: string;
            type: string;
            text?: { body: string };
            image?: { id: string; mime_type: string; caption?: string };
          }>;
        };
        field: string;
      }>;
    }>;
  }): Promise<void> {
    if (!payload.entry) return;

    for (const entry of payload.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        if (change.field !== "messages") continue;

        const { metadata, messages, contacts } = change.value;

        // Only process messages from our configured phone number
        if (metadata.phone_number_id !== this.phoneNumberId) {
          console.log(`Ignoring message for phone number: ${metadata.phone_number_id}`);
          continue;
        }

        // Process each message
        if (messages) {
          for (const message of messages) {
            await this.processMessage(message, metadata, contacts);
          }
        }
      }
    }
  }

  /**
   * Process a single incoming message.
   */
  private async processMessage(
    message: {
      from: string;
      id: string;
      timestamp: string;
      type: string;
      text?: { body: string };
      image?: { id: string; mime_type: string; caption?: string };
    },
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    },
    contacts?: Array<{
      wa_id: string;
      profile: { name: string };
    }>
  ): Promise<void> {
    try {
      // Extract message content
      let content = "";
      if (message.type === "text" && message.text) {
        content = message.text.body;
      } else if (message.type === "image" && message.image) {
        content = message.image.caption || "[Image received]";
      } else {
        content = `[${message.type} received]`;
      }

      if (!content) {
        console.log("Empty message, skipping");
        return;
      }

      // Find business by phone number ID
      const integration = await db.integration.findFirst({
        where: {
          type: "WHATSAPP",
          isActive: true,
        },
      });

      if (!integration) {
        console.error("No WhatsApp integration found");
        return;
      }

      const businessId = integration.businessId;

      // Get or create customer
      const customerName = contacts?.[0]?.profile?.name || `Customer ${message.from.slice(-4)}`;
      const customer = await this.getOrCreateCustomer(businessId, message.from, customerName);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        businessId,
        customer.id
      );

      // Process message through conversation engine
      const result = await conversationEngine.processMessage({
        businessId,
        customerId: customer.id,
        customerName: customer.name,
        channel: "WHATSAPP",
        message: content,
      });

      // Send response via WhatsApp
      await this.sendResponse(message.from, result);

      // Handle any actions
      if (result.action) {
        await this.handleAction(result.action, businessId, customer.id);
      }
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      
      // Try to send error message to customer
      try {
        await this.sendText(message.from, "Sorry, I encountered an error processing your message. Please try again or contact support.");
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
    }
  }

  /**
   * Get or create a customer by phone number.
   */
  private async getOrCreateCustomer(
    businessId: string,
    phone: string,
    name: string
  ) {
    let customer = await db.customer.findFirst({
      where: {
        businessId,
        phone,
      },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          businessId,
          phone,
          name,
          segment: "NEW",
        },
      });
    }

    return customer;
  }

  /**
   * Get or create an active conversation.
   */
  private async getOrCreateConversation(
    businessId: string,
    customerId: string
  ) {
    let conversation = await db.conversation.findFirst({
      where: {
        businessId,
        customerId,
        channel: "WHATSAPP",
        status: "ACTIVE",
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          businessId,
          customerId,
          channel: "WHATSAPP",
          status: "ACTIVE",
        },
      });
    }

    return conversation;
  }

  /**
   * Send response message via WhatsApp.
   */
  private async sendResponse(
    to: string,
    result: ProcessMessageResult
  ): Promise<void> {
    // Split long messages if needed (WhatsApp has 4096 char limit)
    const messages = this.splitMessage(result.response, 4000);

    for (const msg of messages) {
      await this.sendText(to, msg);
    }
  }

  /**
   * Send a text message via WhatsApp Business API.
   */
  private async sendText(to: string, text: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: {
              body: text,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("WhatsApp API error:", error);
      }
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
    }
  }

  /**
   * Send a template message via WhatsApp Business API.
   */
  private async sendTemplate(
    to: string,
    templateName: string,
    language: string = "en_US",
    components?: Array<{
      type: string;
      parameters?: Array<{ type: string; text: string }>;
    }>
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: {
                code: language,
              },
              components,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("WhatsApp template error:", error);
      }
    } catch (error) {
      console.error("Failed to send WhatsApp template:", error);
    }
  }

  /**
   * Handle post-processing actions.
   */
  private async handleAction(
    action: ProcessMessageResult["action"],
    businessId: string,
    customerId: string
  ): Promise<void> {
    if (!action) return;

    switch (action.type) {
      case "CREATE_ORDER":
        // Order created - could trigger notifications, etc.
        console.log(`Order created: ${action.data.orderNumber}`);
        break;

      case "SEND_PAYMENT_REQUEST":
        // Generate payment link and send to customer
        console.log(`Payment request for order: ${action.data.orderNumber}`);
        // TODO: Integrate with Paystack to generate payment link
        break;

      case "UPDATE_ORDER":
        // Order updated
        console.log(`Order updated: ${action.data.orderId}`);
        break;
    }
  }

  /**
   * Split long messages into chunks.
   */
  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        messages.push(remaining);
        break;
      }

      // Find a good break point (newline or space)
      let breakPoint = remaining.lastIndexOf("\n", maxLength);
      if (breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf(" ", maxLength);
      }
      if (breakPoint < maxLength / 2) {
        breakPoint = maxLength;
      }

      messages.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint).trim();
    }

    return messages;
  }
}

/**
 * Create a WhatsApp processor instance from environment variables.
 */
export function createWhatsAppProcessor(): WhatsAppProcessor {
  return new WhatsAppProcessor({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  });
}

export const whatsappProcessor = createWhatsAppProcessor();
