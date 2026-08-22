# OrderFlow Architecture

## Overview

OrderFlow is designed as a modular, multi-tenant SaaS platform for business automation. The architecture separates concerns into distinct layers while maintaining flexibility for future expansion.

## Core Principles

1. **AI is NOT the source of truth** - AI interprets language; deterministic backend systems control financial state, inventory, and business rules.
2. **Multi-tenancy by design** - All data is scoped to a business/tenant. No cross-tenant access is possible.
3. **Provider abstraction** - AI, payments, and messaging use abstraction layers for easy provider swapping.
4. **Security first** - Server-side validation, tenant isolation, webhook verification, and audit logging.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORDERFLOW                            │
├─────────────────────────────────────────────────────────┤
│  Customer Layer │ Business Layer │ Integration Layer    │
│  - WhatsApp     │ - Dashboard    │ - Payments           │
│  - Web Chat     │ - Orders       │ - WhatsApp           │
│  - API          │ - Products     │ - Email              │
│                 │ - Inventory    │ - SMS                │
│                 │ - Customers    │ - Delivery           │
│                 │ - Analytics    │ - Accounting         │
├─────────────────────────────────────────────────────────┤
│                    ORDERFLOW CORE                       │
├─────────────────────────────────────────────────────────┤
│  AI Engine     │ Order Engine    │ Automation Engine    │
├─────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                   │
│                    Redis / Job Queue / Events            │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Order Creation Flow

```
Customer Message → Webhook → Message Store → AI Engine → Order Engine
                                                         ↓
                                            Product Matching
                                                         ↓
                                            Inventory Check
                                                         ↓
                                            Price Calculation
                                                         ↓
                                            Order Creation
                                                         ↓
                                            Payment Request
                                                         ↓
                                            Customer Notification
```

### Payment Flow

```
Order → Payment Request → Paystack → Customer Pays
                                      ↓
                    Webhook → Signature Verification
                                      ↓
                    Payment Record Update
                                      ↓
                    Order Status Update
                                      ↓
                    Inventory Deduction
                                      ↓
                    Fulfillment Task Creation
                                      ↓
                    Customer Notification
```

## Multi-Tenancy

### Tenant Isolation

Every database table contains a `businessId` field. All queries are scoped to the authenticated business.

```typescript
// Middleware ensures tenant context
app.use(tenantResolver);

// All queries include tenant scope
const orders = await db.order.findMany({
  where: withTenant({}, businessId)
});
```

### Authentication Flow

1. User authenticates via Clerk
2. JWT token contains user ID
3. Tenant resolver looks up business membership
4. All subsequent queries are scoped to that business

## AI Architecture

### Abstraction Layer

```typescript
interface AIProvider {
  classifyIntent(input: string): Promise<IntentClassification>;
  extractOrder(input: string, context: OrderContext): Promise<OrderExtraction>;
  resolveProduct(query: string, products: Product[]): Promise<ProductMatch[]>;
  generateReply(context: ReplyContext): Promise<string>;
  summarizeConversation(messages: Message[]): Promise<string>;
}
```

### Implementation

- `AnthropicProvider` - Uses Claude models
- `OpenAIProvider` - Uses GPT models
- `MockProvider` - For development/testing

### Safety Rules

1. AI never determines final prices
2. AI never modifies inventory directly
3. AI never claims payment succeeded
4. All financial actions go through backend validation

## Payment Architecture

### Abstraction Layer

```typescript
interface PaymentProvider {
  initializeTransaction(params: InitializeParams): Promise<InitializeResult>;
  verifyTransaction(reference: string): Promise<VerifyResult>;
  refundTransaction(reference: string, amount?: number): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}
```

### Implementation

- `PaystackProvider` - Nigerian payment gateway
- `MockPaymentProvider` - For development/testing

### Security

1. Webhook signatures are always verified
2. Payment amounts are validated server-side
3. Frontend never confirms payment success
4. Only verified provider webhooks update payment status

## Messaging Architecture

### Abstraction Layer

```typescript
interface MessagingProvider {
  sendText(params: SendTextParams): Promise<SendResult>;
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
  sendImage(params: SendImageParams): Promise<SendResult>;
  sendDocument(params: SendDocumentParams): Promise<SendResult>;
  verifyWebhook(signature: string, body: string): boolean;
}
```

### Implementation

- `WhatsAppProvider` - WhatsApp Business Cloud API
- `MockMessagingProvider` - For development/testing

## Database Design

### Core Entities

- `users` - Platform users
- `businesses` - Tenant businesses
- `business_members` - User-business relationships
- `products` - Product catalog
- `inventory` - Stock levels
- `customers` - Customer profiles
- `orders` - Order records
- `order_items` - Order line items
- `payments` - Payment records
- `conversations` - Customer conversations
- `messages` - Conversation messages
- `automation_rules` - Workflow rules
- `deliveries` - Delivery tracking

### Indexes

All frequently queried fields are indexed:
- `businessId` on all tenant-scoped tables
- `status` on orders, payments, deliveries
- `reference` on payments
- `phone` and `email` on customers

## API Design

### REST Conventions

- `GET /api/v1/{resource}` - List
- `GET /api/v1/{resource}/:id` - Get
- `POST /api/v1/{resource}` - Create
- `PUT /api/v1/{resource}/:id` - Update
- `DELETE /api/v1/{resource}/:id` - Delete
- `PATCH /api/v1/{resource}/:id/{action}` - Action

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 8 units are available",
    "requestId": "req_123456"
  }
}
```

## Security

### Authentication

- JWT tokens via Clerk
- API keys for programmatic access
- Webhook signature verification

### Authorization

- Role-based access control (RBAC)
- Tenant isolation at database level
- Server-side permission checks

### Data Protection

- Secrets never exposed to frontend
- Database credentials in environment variables
- Webhook signatures verified
- Input validation with Zod

## Scalability

### Horizontal Scaling

- Stateless API servers
- Database connection pooling
- Redis for session/cache
- Background job processing

### Performance

- Database indexes on frequently queried fields
- Pagination for list endpoints
- Caching for read-heavy operations
- Async processing for heavy operations

## Monitoring

### Logging

- Structured JSON logs
- Request IDs for tracing
- Error tracking
- Audit logs for sensitive operations

### Health Checks

- `/api/v1/health` - Overall health
- `/api/v1/health/ready` - Readiness probe
- `/api/v1/health/live` - Liveness probe

## Future Considerations

### Phase 2 Enhancements

- WebSocket for real-time updates
- Background job queue (BullMQ)
- Email/SMS notifications
- Advanced analytics
- AI insights

### Phase 3 Enhancements

- Mobile apps
- Public API
- Webhook system
- Automation workflows
- Multi-language support
