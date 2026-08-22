# OrderFlow Security

## Overview

Security is a core concern in OrderFlow's architecture. This document outlines the security measures implemented across the platform.

## Authentication

### Clerk Integration

OrderFlow uses [Clerk](https://clerk.com) for authentication:

- JWT tokens for session management
- Multi-factor authentication support
- Social login providers
- Session management and revocation

### API Key Authentication

For programmatic access:

```typescript
// API keys are hashed before storage
const apiKey = await db.apiKey.create({
  data: {
    userId,
    businessId,
    name: "Production API Key",
    keyHash: await hashApiKey(rawKey),
    prefix: rawKey.substring(0, 8),
    scopes: ["read", "write"],
  },
});
```

### Authentication Flow

1. User authenticates via Clerk
2. JWT token contains user ID
3. Tenant resolver looks up business membership
4. All subsequent queries are scoped to that business

## Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| PLATFORM_OWNER | Full platform access |
| BUSINESS_OWNER | Full business access |
| MANAGER | Order, inventory, customer, analytics access |
| STAFF | View assigned orders, update fulfillment |

### Permission Enforcement

Permissions are enforced server-side:

```typescript
// Middleware checks permissions
router.delete("/:id", requireRole(["BUSINESS_OWNER", "MANAGER"]), async (req, res) => {
  // Only business owners and managers can delete
});
```

## Multi-Tenancy

### Tenant Isolation

Every database table contains a `businessId` field:

```typescript
// All queries include tenant scope
const orders = await db.order.findMany({
  where: withTenant({}, businessId)
});
```

### Cross-Tenant Prevention

```typescript
// Assert tenant access before operations
assertTenantAccess(order, businessId, "Order");
```

## Data Protection

### Secrets Management

- All secrets stored in environment variables
- Never expose secrets to the frontend
- Use `NEXT_PUBLIC_` prefix only for public keys

### Webhook Verification

```typescript
// Always verify webhook signatures
const signature = req.headers["x-paystack-signature"];
const expectedSignature = crypto
  .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
  .update(body)
  .digest("base64");

if (signature !== expectedSignature) {
  return res.sendStatus(403);
}
```

### Payment Security

1. Never trust frontend payment confirmation
2. Only verified provider webhooks update payment status
3. Validate payment amounts server-side
4. Use idempotency keys for payment operations

## Input Validation

### Zod Validation

All API inputs are validated with Zod:

```typescript
const CreateOrderSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

// Validation happens before any business logic
const data = CreateOrderSchema.parse(req.body);
```

### SQL Injection Prevention

Prisma ORM parameterizes all queries:

```typescript
// Prisma handles parameterization
const orders = await db.order.findMany({
  where: {
    orderNumber: { contains: searchTerm, mode: "insensitive" }
  }
});
```

## API Security

### Rate Limiting

```typescript
// 100 requests per minute per IP
const rateLimiter = (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  
  if (store[key] && store[key].count > MAX_REQUESTS) {
    return res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Too many requests" }
    });
  }
};
```

### Security Headers

```typescript
// Helmet middleware
app.use(helmet());
```

Headers set:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### CORS

```typescript
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL,
  credentials: true,
}));
```

## Audit Logging

All sensitive operations are logged:

```typescript
await db.auditLog.create({
  data: {
    businessId,
    userId,
    action: "ORDER_APPROVED",
    resource: "Order",
    resourceId: orderId,
    oldValue: { status: "PENDING_CONFIRMATION" },
    newValue: { status: "PAID" },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  },
});
```

### Logged Events

- Order created, updated, deleted
- Payment initiated, verified, refunded
- Inventory adjusted
- Customer created, updated, deleted
- Team member invited
- API key created, revoked

## Webhook Security

### Idempotency

```typescript
// Check if webhook already processed
const existingEvent = await db.paymentEvent.findFirst({
  where: { paymentId, type: "CHARGE_SUCCESS" }
});

if (existingEvent) {
  // Already processed, skip
  return res.sendStatus(200);
}
```

### Retry Handling

Webhooks are retried with exponential backoff:

```typescript
const webhookDelivery = await db.webhookDelivery.create({
  data: {
    endpointId,
    event: "order.created",
    payload,
    status: "PENDING",
    attempts: 0,
  },
});
```

## AI Safety

### Rules

1. AI never determines final prices
2. AI never modifies inventory directly
3. AI never claims payment succeeded
4. All financial actions go through backend validation

### Implementation

```typescript
// AI extracts intent, backend validates
const extraction = await ai.extractOrder(input, context);

// Backend resolves products and prices
const products = await db.product.findMany({
  where: { id: { in: extraction.items.map(i => i.productId) } }
});

// Prices are determined by backend, not AI
const order = await db.order.create({
  data: {
    items: extraction.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: products.find(p => p.id === item.productId).price,
    })),
  },
});
```

## Data Retention

### Configurable Retention

Businesses can configure:
- Data retention periods
- Automatic deletion schedules
- Export before deletion

### Privacy Compliance

- GDPR support
- Data export capability
- Right to be forgotten
- Consent management

## Incident Response

### Monitoring

- Structured logging
- Error tracking (Sentry integration ready)
- Request ID tracing
- Webhook delivery logs

### Alerting

- Failed payment webhooks
- High error rates
- Unusual traffic patterns
- Database connection issues

## Security Checklist

- [ ] Authentication via Clerk
- [ ] Tenant isolation at database level
- [ ] Server-side permission checks
- [ ] Input validation with Zod
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Security headers (Helmet)
- [ ] Webhook signature verification
- [ ] Audit logging
- [ ] No secrets in frontend
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection
- [ ] CSRF protection where applicable
- [ ] Secure API key storage
- [ ] Payment amount validation
- [ ] Idempotent webhook handling
