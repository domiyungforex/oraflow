import { db } from "@orderflow/db";

/**
 * Conversation states for tracking multi-turn interactions.
 */
export type ConversationStateType =
  | "IDLE"
  | "AWAITING_PRODUCT"
  | "AWAITING_QUANTITY"
  | "AWAITING_DELIVERY_DATE"
  | "AWAITING_DELIVERY_ADDRESS"
  | "AWAITING_CONFIRMATION"
  | "AWAITING_PAYMENT"
  | "ORDER_IN_PROGRESS";

/**
 * Pending item in an order being built.
 */
export interface PendingOrderItem {
  productQuery: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  availableStock?: number;
}

/**
 * Conversation state data structure.
 */
export interface ConversationState {
  state: ConversationStateType;
  pendingItems: PendingOrderItem[];
  currentItemId?: string;
  deliveryDate?: string;
  deliveryAddress?: string;
  customerId?: string;
  customerName?: string;
  businessId: string;
  orderInProgress?: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  };
  lastActivity: string;
  context?: Record<string, unknown>;
}

/**
 * Manages conversation state for multi-turn interactions.
 * State is persisted in the database to survive restarts.
 */
export class ConversationStateManager {
  /**
   * Get current state for a conversation session.
   */
  async getState(
    businessId: string,
    customerId: string,
    channel: string
  ): Promise<ConversationState | null> {
    const session = await db.conversationSession.findFirst({
      where: {
        businessId,
        customerId,
        channel,
        isActive: true,
      },
    });

    if (!session) return null;

    return session.state as unknown as ConversationState;
  }

  /**
   * Create a new conversation state.
   */
  async createState(
    businessId: string,
    customerId: string,
    channel: string,
    initialData?: Partial<ConversationState>
  ): Promise<ConversationState> {
    const state: ConversationState = {
      state: "IDLE",
      pendingItems: [],
      businessId,
      customerId,
      lastActivity: new Date().toISOString(),
      ...initialData,
    };

    await db.conversationSession.create({
      data: {
        businessId,
        customerId,
        channel,
        state: state as any,
        isActive: true,
        lastActivity: new Date(),
      },
    });

    return state;
  }

  /**
   * Update conversation state.
   */
  async updateState(
    businessId: string,
    customerId: string,
    channel: string,
    updates: Partial<ConversationState>
  ): Promise<ConversationState> {
    const existing = await this.getState(businessId, customerId, channel);

    if (!existing) {
      return this.createState(businessId, customerId, channel, updates);
    }

    const newState: ConversationState = {
      ...existing,
      ...updates,
      lastActivity: new Date().toISOString(),
    };

    await db.conversationSession.updateMany({
      where: {
        businessId,
        customerId,
        channel,
        isActive: true,
      },
      data: {
        state: newState as any,
        lastActivity: new Date(),
      },
    });

    return newState;
  }

  /**
   * Transition to a new state.
   */
  async transition(
    businessId: string,
    customerId: string,
    channel: string,
    newState: ConversationStateType,
    data?: Partial<ConversationState>
  ): Promise<ConversationState> {
    return this.updateState(businessId, customerId, channel, {
      state: newState,
      ...data,
    });
  }

  /**
   * Add a pending item to the order.
   */
  async addPendingItem(
    businessId: string,
    customerId: string,
    channel: string,
    item: PendingOrderItem
  ): Promise<ConversationState> {
    const current = await this.getState(businessId, customerId, channel);
    const pendingItems = current?.pendingItems || [];

    // Check if item already exists (update quantity instead)
    const existingIndex = pendingItems.findIndex(
      (i) => i.productId === item.productId || i.productQuery === item.productQuery
    );

    if (existingIndex >= 0 && item.productId) {
      // Update existing item quantity
      pendingItems[existingIndex] = {
        ...pendingItems[existingIndex],
        quantity: (pendingItems[existingIndex].quantity || 0) + (item.quantity || 1),
        ...item,
      };
    } else {
      pendingItems.push(item);
    }

    return this.updateState(businessId, customerId, channel, {
      state: "ORDER_IN_PROGRESS",
      pendingItems,
    });
  }

  /**
   * Update a pending item.
   */
  async updatePendingItem(
    businessId: string,
    customerId: string,
    channel: string,
    itemId: string,
    updates: Partial<PendingOrderItem>
  ): Promise<ConversationState> {
    const current = await this.getState(businessId, customerId, channel);
    if (!current) throw new Error("No conversation state found");

    const pendingItems = current.pendingItems.map((item) =>
      item.productId === itemId || item.productQuery === itemId
        ? { ...item, ...updates }
        : item
    );

    return this.updateState(businessId, customerId, channel, {
      pendingItems,
    });
  }

  /**
   * Remove a pending item.
   */
  async removePendingItem(
    businessId: string,
    customerId: string,
    channel: string,
    itemId: string
  ): Promise<ConversationState> {
    const current = await this.getState(businessId, customerId, channel);
    if (!current) throw new Error("No conversation state found");

    const pendingItems = current.pendingItems.filter(
      (item) => item.productId !== itemId && item.productQuery !== itemId
    );

    return this.updateState(businessId, customerId, channel, {
      pendingItems,
    });
  }

  /**
   * Clear all pending items and reset to idle.
   */
  async reset(
    businessId: string,
    customerId: string,
    channel: string
  ): Promise<ConversationState> {
    return this.updateState(businessId, customerId, channel, {
      state: "IDLE",
      pendingItems: [],
      deliveryDate: undefined,
      deliveryAddress: undefined,
      orderInProgress: undefined,
    });
  }

  /**
   * Deactivate a session.
   */
  async deactivate(
    businessId: string,
    customerId: string,
    channel: string
  ): Promise<void> {
    await db.conversationSession.updateMany({
      where: {
        businessId,
        customerId,
        channel,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Calculate order total from pending items.
   */
  calculateTotal(state: ConversationState): {
    subtotal: number;
    itemCount: number;
  } {
    let subtotal = 0;
    let itemCount = 0;

    for (const item of state.pendingItems) {
      if (item.unitPrice && item.quantity) {
        subtotal += item.unitPrice * item.quantity;
        itemCount += item.quantity;
      }
    }

    return { subtotal, itemCount };
  }
}

export const conversationStateManager = new ConversationStateManager();
