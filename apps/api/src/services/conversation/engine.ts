import { db, withTenant } from "@orderflow/db";
import { conversationStateManager, ConversationState, PendingOrderItem } from "./state";
import { productMatcher, ProductMatch } from "../product/matcher";
import { orderExtractor, ExtractionResult } from "../ai/order-extractor";

export interface ProcessMessageResult {
  response: string;
  state: ConversationState;
  action?: {
    type: "CREATE_ORDER" | "SEND_PAYMENT_REQUEST" | "UPDATE_ORDER";
    data: Record<string, unknown>;
  };
}

/**
 * Main conversation engine that processes incoming messages
 * and generates appropriate responses.
 */
export class ConversationEngine {
  /**
   * Process an incoming customer message.
   */
  async processMessage(params: {
    businessId: string;
    customerId: string;
    customerName?: string;
    channel: string;
    message: string;
  }): Promise<ProcessMessageResult> {
    const { businessId, customerId, customerName, channel, message } = params;

    // 1. Get or create conversation state
    let state = await conversationStateManager.getState(businessId, customerId, channel);
    
    if (!state) {
      state = await conversationStateManager.createState(businessId, customerId, channel, {
        customerName,
      });
    }

    // 2. Get available products for AI context
    const products = await db.product.findMany({
      where: withTenant({ isActive: true }, businessId),
      select: {
        name: true,
        aliases: true,
        unit: true,
      },
    });

    // 3. Get conversation history for context
    const conversation = await db.conversation.findFirst({
      where: {
        businessId,
        customerId,
        channel,
        status: "ACTIVE",
      },
      include: {
        messages: {
          orderBy: { sentAt: "desc" },
          take: 10,
        },
      },
    });

    const conversationHistory = conversation?.messages.map((m) => ({
      role: m.direction === "INBOUND" ? "user" : "assistant",
      content: m.content,
    })) || [];

    // 4. Extract intent and order details using AI
    const extraction = await orderExtractor.extract(message, {
      availableProducts: products,
      customerName,
      conversationHistory,
    });

    // 5. Process based on current state and extraction
    let result: ProcessMessageResult;

    switch (state.state) {
      case "IDLE":
        result = await this.handleIdleState(state, extraction, params);
        break;
      case "ORDER_IN_PROGRESS":
        result = await this.handleOrderInProgressState(state, extraction, params);
        break;
      case "AWAITING_CONFIRMATION":
        result = await this.handleAwaitingConfirmationState(state, extraction, params);
        break;
      case "AWAITING_QUANTITY":
        result = await this.handleAwaitingQuantityState(state, extraction, params);
        break;
      case "AWAITING_DELIVERY_DATE":
        result = await this.handleAwaitingDeliveryDateState(state, extraction, params);
        break;
      case "AWAITING_DELIVERY_ADDRESS":
        result = await this.handleAwaitingDeliveryAddressState(state, extraction, params);
        break;
      case "AWAITING_PAYMENT":
        result = await this.handleAwaitingPaymentState(state, extraction, params);
        break;
      default:
        result = await this.handleIdleState(state, extraction, params);
    }

    // 6. Store the message and response
    await this.storeMessages(conversation?.id, message, result.response);

    return result;
  }

  /**
   * Handle message when in IDLE state.
   */
  private async handleIdleState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    if (extraction.intent === "GREETING") {
      const response = `Hello ${params.customerName || "there"}! Welcome to our store. How can I help you today?`;
      return { response, state };
    }

    if (extraction.intent === "CREATE_ORDER" && extraction.items.length > 0) {
      // Start building an order
      const { matchedItems, ambiguousItems } = await this.matchAndResolveItems(
        extraction.items,
        params.businessId,
        params.customerId
      );

      // Handle ambiguous products
      if (ambiguousItems.length > 0) {
        const ambiguousList = ambiguousItems
          .map((a) => `"${a.query}" - did you mean ${a.matches.map((m) => m.name).join(" or ")}?`)
          .join("\n");

        const response = `I found multiple products matching your request:\n${ambiguousList}\n\nPlease let me know which one you'd like.`;
        
        const newState = await conversationStateManager.updateState(
          params.businessId,
          params.customerId,
          params.channel,
          { state: "ORDER_IN_PROGRESS", pendingItems: matchedItems }
        );

        return { response, state: newState };
      }

      // Add all matched items
      for (const item of matchedItems) {
        await conversationStateManager.addPendingItem(
          params.businessId,
          params.customerId,
          params.channel,
          item
        );
      }

      const updatedState = await conversationStateManager.getState(
        params.businessId,
        params.customerId,
        params.channel
      );

      // Check what's missing
      const missingInfo = this.checkMissingInfo(updatedState!);

      if (missingInfo.length === 0) {
        // All info present, show summary
        const response = this.generateOrderSummary(updatedState!);
        const newState = await conversationStateManager.transition(
          params.businessId,
          params.customerId,
          params.channel,
          "AWAITING_CONFIRMATION"
        );
        return { response, state: newState };
      }

      // Ask for missing info
      const response = this.generateMissingInfoPrompt(updatedState!, missingInfo);
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        missingInfo.includes("delivery date") ? "AWAITING_DELIVERY_DATE" : "ORDER_IN_PROGRESS"
      );

      return { response, state: newState };
    }

    // General intent or no items extracted
    const response = await orderExtractor.generateResponse({
      intent: extraction.intent,
      customerName: params.customerName,
      missingInfo: extraction.missingInfo,
      state: state.state,
    });

    return { response, state };
  }

  /**
   * Handle message when order is in progress.
   */
  private async handleOrderInProgressState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    // Check if this is a quantity response (e.g., "5", "5 bags", "five")
    const quantityMatch = params.message.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred)$/i);

    if (quantityMatch) {
      const quantity = this.parseQuantity(params.message);
      
      if (quantity && state.pendingItems.length > 0) {
        // Update the last pending item with quantity
        const lastItem = state.pendingItems[state.pendingItems.length - 1];
        if (!lastItem.quantity) {
          await conversationStateManager.updatePendingItem(
            params.businessId,
            params.customerId,
            params.channel,
            lastItem.productId || lastItem.productQuery,
            { quantity }
          );
        }
      }
    }

    // Check if there are new items to add
    if (extraction.items.length > 0) {
      const { matchedItems } = await this.matchAndResolveItems(
        extraction.items,
        params.businessId,
        params.customerId
      );

      for (const item of matchedItems) {
        await conversationStateManager.addPendingItem(
          params.businessId,
          params.customerId,
          params.channel,
          item
        );
      }
    }

    // Handle delivery date if mentioned
    if (extraction.deliveryDate) {
      await conversationStateManager.updateState(
        params.businessId,
        params.customerId,
        params.channel,
        { deliveryDate: extraction.deliveryDate }
      );
    }

    // Handle delivery address if mentioned
    if (extraction.deliveryAddress) {
      await conversationStateManager.updateState(
        params.businessId,
        params.customerId,
        params.channel,
        { deliveryAddress: extraction.deliveryAddress }
      );
    }

    const updatedState = await conversationStateManager.getState(
      params.businessId,
      params.customerId,
      params.channel
    );

    // Check what's still missing
    const missingInfo = this.checkMissingInfo(updatedState!);

    if (missingInfo.length === 0) {
      // All info present, show summary
      const response = this.generateOrderSummary(updatedState!);
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "AWAITING_CONFIRMATION"
      );
      return { response, state: newState };
    }

    // Ask for missing info
    const response = this.generateMissingInfoPrompt(updatedState!, missingInfo);
    const newState = await conversationStateManager.transition(
      params.businessId,
      params.customerId,
      params.channel,
      missingInfo.includes("delivery date") ? "AWAITING_DELIVERY_DATE" : "ORDER_IN_PROGRESS"
    );

    return { response, state: newState };
  }

  /**
   * Handle message when awaiting quantity for an item.
   */
  private async handleAwaitingQuantityState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    const quantity = this.parseQuantity(params.message);

    if (quantity && state.currentItemId) {
      await conversationStateManager.updatePendingItem(
        params.businessId,
        params.customerId,
        params.channel,
        state.currentItemId,
        { quantity }
      );

      const updatedState = await conversationStateManager.getState(
        params.businessId,
        params.customerId,
        params.channel
      );

      const missingInfo = this.checkMissingInfo(updatedState!);

      if (missingInfo.length === 0) {
        const response = this.generateOrderSummary(updatedState!);
        const newState = await conversationStateManager.transition(
          params.businessId,
          params.customerId,
          params.channel,
          "AWAITING_CONFIRMATION"
        );
        return { response, state: newState };
      }

      const response = `Got it! ${quantity} added. ${this.generateMissingInfoPrompt(updatedState!, missingInfo)}`;
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "ORDER_IN_PROGRESS"
      );

      return { response, state: newState };
    }

    // Couldn't parse quantity
    const response = "I didn't catch the quantity. How many would you like?";
    return { response, state };
  }

  /**
   * Handle message when awaiting delivery date.
   */
  private async handleAwaitingDeliveryDateState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    const date = this.parseDate(params.message);

    if (date) {
      await conversationStateManager.updateState(
        params.businessId,
        params.customerId,
        params.channel,
        { deliveryDate: date }
      );

      const updatedState = await conversationStateManager.getState(
        params.businessId,
        params.customerId,
        params.channel
      );

      const missingInfo = this.checkMissingInfo(updatedState!);

      if (missingInfo.length === 0) {
        const response = this.generateOrderSummary(updatedState!);
        const newState = await conversationStateManager.transition(
          params.businessId,
          params.customerId,
          params.channel,
          "AWAITING_CONFIRMATION"
        );
        return { response, state: newState };
      }

      const response = `Delivery on ${date} noted. ${this.generateMissingInfoPrompt(updatedState!, missingInfo)}`;
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "ORDER_IN_PROGRESS"
      );

      return { response, state: newState };
    }

    // Couldn't parse date
    const response = "When would you like this delivered? You can say 'today', 'tomorrow', or give a specific date.";
    return { response, state };
  }

  /**
   * Handle message when awaiting delivery address.
   */
  private async handleAwaitingDeliveryAddressState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    if (extraction.deliveryAddress || params.message.length > 5) {
      await conversationStateManager.updateState(
        params.businessId,
        params.customerId,
        params.channel,
        { deliveryAddress: extraction.deliveryAddress || params.message }
      );

      const updatedState = await conversationStateManager.getState(
        params.businessId,
        params.customerId,
        params.channel
      );

      const response = this.generateOrderSummary(updatedState!);
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "AWAITING_CONFIRMATION"
      );

      return { response, state: newState };
    }

    const response = "Please provide your delivery address.";
    return { response, state };
  }

  /**
   * Handle message when awaiting order confirmation.
   */
  private async handleAwaitingConfirmationState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    const lowerMessage = params.message.toLowerCase();

    // Check for confirmation
    if (lowerMessage.match(/\b(yes|yeah|yep|confirm|proceed|ok|okay|go ahead|do it)\b/)) {
      // Create the order
      const order = await this.createOrder(state, params.businessId, params.customerId);

      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "AWAITING_PAYMENT",
        { orderInProgress: { orderId: order.id, orderNumber: order.orderNumber, totalAmount: Number(order.totalAmount) } }
      );

      const response = `Great! Your order ${order.orderNumber} has been created. Total: ₦${Number(order.totalAmount).toLocaleString()}.\n\nWould you like to proceed with payment now?`;

      return {
        response,
        state: newState,
        action: {
          type: "CREATE_ORDER",
          data: { orderId: order.id, orderNumber: order.orderNumber },
        },
      };
    }

    // Check for modifications
    if (lowerMessage.match(/\b(change|modify|update|edit|add|remove|delete)\b/)) {
      const response = "Sure, what would you like to change? You can add, remove, or modify items.";
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "ORDER_IN_PROGRESS"
      );
      return { response, state: newState };
    }

    // Check for cancellation
    if (lowerMessage.match(/\b(cancel|no|nevermind|forget it)\b/)) {
      await conversationStateManager.reset(
        params.businessId,
        params.customerId,
        params.channel
      );

      const response = "Order cancelled. Let me know if you'd like to start a new order!";
      return { response, state };
    }

    // Unclear response
    const response = "Would you like to proceed with this order? Say 'yes' to confirm, 'change' to modify, or 'cancel' to start over.";
    return { response, state };
  }

  /**
   * Handle message when awaiting payment.
   */
  private async handleAwaitingPaymentState(
    state: ConversationState,
    extraction: ExtractionResult,
    params: { businessId: string; customerId: string; customerName?: string; channel: string; message: string }
  ): Promise<ProcessMessageResult> {
    const lowerMessage = params.message.toLowerCase();

    if (lowerMessage.match(/\b(yes|yeah|pay|proceed|now|pay now)\b/)) {
      // Generate payment request
      if (state.orderInProgress) {
        const response = `I'll send you a payment link for ₦${state.orderInProgress.totalAmount.toLocaleString()}. Please check your messages.`;
        
        const newState = await conversationStateManager.transition(
          params.businessId,
          params.customerId,
          params.channel,
          "IDLE"
        );

        return {
          response,
          state: newState,
          action: {
            type: "SEND_PAYMENT_REQUEST",
            data: {
              orderId: state.orderInProgress.orderId,
              orderNumber: state.orderInProgress.orderNumber,
              amount: state.orderInProgress.totalAmount,
            },
          },
        };
      }
    }

    if (lowerMessage.match(/\b(later|not now|tomorrow|after)\b/)) {
      const response = "No problem! Your order is saved. You can pay anytime. Just let me know when you're ready.";
      const newState = await conversationStateManager.transition(
        params.businessId,
        params.customerId,
        params.channel,
        "IDLE"
      );
      return { response, state: newState };
    }

    const response = "Would you like to pay now? Say 'yes' for a payment link, or 'later' to pay another time.";
    return { response, state };
  }

  // Helper methods

  private async matchAndResolveItems(
    items: ExtractionResult["items"],
    businessId: string,
    customerId: string
  ): Promise<{ matchedItems: PendingOrderItem[]; ambiguousItems: Array<{ query: string; matches: ProductMatch[] }> }> {
    const matchedItems: PendingOrderItem[] = [];
    const ambiguousItems: Array<{ query: string; matches: ProductMatch[] }> = [];

    for (const item of items) {
      const matches = await productMatcher.findMatches(item.productQuery, businessId, 5);

      if (matches.length === 0) {
        // No match found, add as unresolved
        matchedItems.push({
          productQuery: item.productQuery,
          quantity: item.quantity,
          unit: item.unit,
        });
        continue;
      }

      if (productMatcher.isAmbiguous(matches)) {
        ambiguousItems.push({ query: item.productQuery, matches });
        continue;
      }

      // Use best match
      const bestMatch = matches[0];
      const price = await productMatcher.getCustomerPrice(
        bestMatch.productId,
        customerId,
        businessId
      );

      matchedItems.push({
        productQuery: item.productQuery,
        productId: bestMatch.productId,
        productName: bestMatch.name,
        quantity: item.quantity,
        unit: item.unit || bestMatch.unit,
        unitPrice: price,
        availableStock: await productMatcher.getAvailableStock(bestMatch.productId, businessId),
      });
    }

    return { matchedItems, ambiguousItems };
  }

  private checkMissingInfo(state: ConversationState): string[] {
    const missing: string[] = [];

    if (state.pendingItems.length === 0) {
      missing.push("products");
    }

    const itemsWithoutQuantity = state.pendingItems.filter((i) => !i.quantity);
    if (itemsWithoutQuantity.length > 0) {
      missing.push("quantities");
    }

    if (!state.deliveryDate) {
      missing.push("delivery date");
    }

    return missing;
  }

  private generateOrderSummary(state: ConversationState): string {
    const { subtotal, itemCount } = conversationStateManager.calculateTotal(state);

    const itemsList = state.pendingItems
      .map((item) => {
        const qty = item.quantity || 0;
        const price = item.unitPrice || 0;
        const total = qty * price;
        return `• ${item.productName || item.productQuery} - ${qty} ${item.unit || "units"} × ₦${price.toLocaleString()} = ₦${total.toLocaleString()}`;
      })
      .join("\n");

    const deliveryDateStr = state.deliveryDate
      ? new Date(state.deliveryDate).toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";

    return `📋 *Order Summary*\n\n${itemsList}\n\n📦 Items: ${itemCount}\n💰 Subtotal: ₦${subtotal.toLocaleString()}\n📅 Delivery: ${deliveryDateStr}\n\nWould you like to proceed? Say 'yes' to confirm, 'change' to modify, or 'cancel' to start over.`;
  }

  private generateMissingInfoPrompt(state: ConversationState, missingInfo: string[]): string {
    if (missingInfo.includes("products")) {
      return "What would you like to order? Tell me the products and quantities.";
    }

    if (missingInfo.includes("quantities")) {
      const itemsWithoutQty = state.pendingItems.filter((i) => !i.quantity);
      const itemNames = itemsWithoutQty.map((i) => i.productQuery).join(" and ");
      return `How many ${itemNames} would you like?`;
    }

    if (missingInfo.includes("delivery date")) {
      return "When would you like this delivered? You can say 'today', 'tomorrow', or give a specific date.";
    }

    return "Is there anything else you'd like to add?";
  }

  private parseQuantity(text: string): number | null {
    const lower = text.toLowerCase().trim();

    // Word to number mapping
    const wordNumbers: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, hundred: 100,
    };

    // Check for word numbers
    for (const [word, num] of Object.entries(wordNumbers)) {
      if (lower === word) return num;
    }

    // Check for number patterns like "twenty five" or "five bags"
    const numberWords = lower.match(/\b(\w+)\s*(?:bags?|cartons?|pieces?|units?|tins?|packs?|crates?|kegs?|bottles?)?\b/);
    if (numberWords) {
      const num = wordNumbers[numberWords[1]];
      if (num) return num;
    }

    // Check for numeric digits
    const numericMatch = lower.match(/(\d+)/);
    if (numericMatch) {
      return parseInt(numericMatch[1]);
    }

    return null;
  }

  private parseDate(text: string): string | null {
    const lower = text.toLowerCase().trim();
    const now = new Date();

    if (lower.includes("today")) {
      return now.toISOString().split("T")[0];
    }

    if (lower.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    if (lower.includes("next week")) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }

    // Try to parse date patterns like "25th december" or "december 25"
    const dateMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
      ].indexOf(dateMatch[2]);
      
      if (month >= 0) {
        const date = new Date(now.getFullYear(), month, day);
        if (date < now) {
          date.setFullYear(date.getFullYear() + 1);
        }
        return date.toISOString().split("T")[0];
      }
    }

    // Try to parse YYYY-MM-DD format
    const isoMatch = lower.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }

    return null;
  }

  private async createOrder(
    state: ConversationState,
    businessId: string,
    customerId: string
  ) {
    const business = await db.business.findUnique({ where: { id: businessId } });
    const taxRate = business?.taxRate ? Number(business.taxRate) / 100 : 0;

    // Generate order number
    const lastOrder = await db.order.findFirst({
      where: withTenant({}, businessId),
      orderBy: { createdAt: "desc" },
    });
    const orderNumber = `ORD-${String((lastOrder ? parseInt(lastOrder.orderNumber.replace("ORD-", "")) : 0) + 1).padStart(4, "0")}`;

    // Calculate totals
    const subtotal = state.pendingItems.reduce((sum, item) => {
      return sum + (item.unitPrice || 0) * (item.quantity || 0);
    }, 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create order
    const order = await db.order.create({
      data: {
        businessId,
        customerId,
        orderNumber,
        source: "WHATSAPP",
        status: "PENDING_CONFIRMATION",
        subtotal,
        taxAmount,
        totalAmount,
        notes: state.notes || `Order via WhatsApp - Delivery: ${state.deliveryDate || "Not specified"}`,
        items: {
          create: state.pendingItems
            .filter((item) => item.productId)
            .map((item) => ({
              productId: item.productId!,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              total: (item.unitPrice || 0) * (item.quantity || 0),
            })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        businessId,
        action: "ORDER_CREATED",
        resource: "Order",
        resourceId: order.id,
        newValue: order,
      },
    });

    // Reset conversation state
    await conversationStateManager.reset(businessId, customerId, "WHATSAPP");

    return order;
  }

  private async storeMessages(
    conversationId: string | undefined,
    userMessage: string,
    botResponse: string
  ): Promise<void> {
    if (!conversationId) return;

    // Store user message
    await db.message.create({
      data: {
        conversationId,
        direction: "INBOUND",
        content: userMessage,
        messageType: "TEXT",
      },
    });

    // Store bot response
    await db.message.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        content: botResponse,
        messageType: "TEXT",
      },
    });
  }
}

export const conversationEngine = new ConversationEngine();
