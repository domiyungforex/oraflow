import {
  MessagingProvider,
  SendTextParams,
  SendTemplateParams,
  SendImageParams,
  SendDocumentParams,
  SendResult,
} from "./base";

export class MockMessagingProvider implements MessagingProvider {
  name = "mock";
  private messages: Array<{
    to: string;
    type: string;
    content: string;
    timestamp: Date;
  }> = [];

  async sendText(params: SendTextParams): Promise<SendResult> {
    const messageId = `mock_msg_${Date.now()}`;
    
    this.messages.push({
      to: params.to,
      type: "text",
      content: params.text,
      timestamp: new Date(),
    });

    console.log(`[Mock WhatsApp] Sending text to ${params.to}: ${params.text}`);

    return {
      success: true,
      messageId,
    };
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    const messageId = `mock_msg_${Date.now()}`;
    
    this.messages.push({
      to: params.to,
      type: "template",
      content: params.template,
      timestamp: new Date(),
    });

    console.log(`[Mock WhatsApp] Sending template "${params.template}" to ${params.to}`);

    return {
      success: true,
      messageId,
    };
  }

  async sendImage(params: SendImageParams): Promise<SendResult> {
    const messageId = `mock_msg_${Date.now()}`;
    
    this.messages.push({
      to: params.to,
      type: "image",
      content: params.imageUrl,
      timestamp: new Date(),
    });

    console.log(`[Mock WhatsApp] Sending image to ${params.to}: ${params.imageUrl}`);

    return {
      success: true,
      messageId,
    };
  }

  async sendDocument(params: SendDocumentParams): Promise<SendResult> {
    const messageId = `mock_msg_${Date.now()}`;
    
    this.messages.push({
      to: params.to,
      type: "document",
      content: params.documentUrl,
      timestamp: new Date(),
    });

    console.log(`[Mock WhatsApp] Sending document to ${params.to}: ${params.filename}`);

    return {
      success: true,
      messageId,
    };
  }

  verifyWebhook(signature: string, body: string): boolean {
    // Mock always returns true for development
    console.log("[Mock WhatsApp] Webhook verification skipped (mock mode)");
    return true;
  }

  // Helper method to get sent messages (for testing)
  getMessages() {
    return this.messages;
  }

  // Helper method to clear messages (for testing)
  clearMessages() {
    this.messages = [];
  }
}
