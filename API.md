# OrderFlow API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All API requests require authentication via API key or JWT token.

### API Key Authentication

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/v1/orders
```

### JWT Token Authentication

```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:3001/api/v1/orders
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Window reset timestamp

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "req_123456"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Orders

### List Orders

```http
GET /api/v1/orders
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | - | Filter by status |
| `search` | string | - | Search by order number or customer name |

**Response:**

```json
{
  "data": [
    {
      "id": "ord_123",
      "orderNumber": "ORD-0001",
      "status": "PENDING_PAYMENT",
      "paymentStatus": "UNPAID",
      "subtotal": 185000,
      "taxAmount": 13875,
      "deliveryFee": 2000,
      "totalAmount": 200875,
      "customer": {
        "id": "cust_123",
        "name": "Chidinma Eze"
      },
      "items": [...],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Get Order

```http
GET /api/v1/orders/:id
```

**Response:**

```json
{
  "data": {
    "id": "ord_123",
    "orderNumber": "ORD-0001",
    "status": "PENDING_PAYMENT",
    "paymentStatus": "UNPAID",
    "fulfillmentStatus": "PENDING",
    "subtotal": 185000,
    "taxAmount": 13875,
    "deliveryFee": 2000,
    "totalAmount": 200875,
    "customer": {...},
    "items": [
      {
        "id": "item_123",
        "productId": "prod_123",
        "quantity": 20,
        "unitPrice": 2500,
        "total": 50000,
        "product": {
          "name": "Malta Guinness 50cl",
          "sku": "MGU-50CL"
        }
      }
    ],
    "payments": [...],
    "delivery": null,
    "auditLogs": [...],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Create Order

```http
POST /api/v1/orders
```

**Request Body:**

```json
{
  "customerId": "cust_123",
  "items": [
    {
      "productId": "prod_123",
      "quantity": 20,
      "unitPrice": 2500
    }
  ],
  "notes": "Deliver tomorrow morning",
  "deliveryFee": 2000
}
```

**Response:**

```json
{
  "data": {
    "id": "ord_124",
    "orderNumber": "ORD-0002",
    "status": "DRAFT",
    "subtotal": 50000,
    "taxAmount": 3750,
    "deliveryFee": 2000,
    "totalAmount": 55750,
    ...
  }
}
```

### Update Order Status

```http
PATCH /api/v1/orders/:id/status
```

**Request Body:**

```json
{
  "status": "PENDING_CONFIRMATION",
  "reason": "Order verified"
}
```

**Valid Status Transitions:**

| From | To |
|------|-----|
| `DRAFT` | `PENDING_CONFIRMATION`, `CANCELLED` |
| `PENDING_CONFIRMATION` | `PENDING_PAYMENT`, `CANCELLED` |
| `PENDING_PAYMENT` | `PAID`, `CANCELLED` |
| `PAID` | `PROCESSING`, `CANCELLED`, `REFUNDED` |
| `PROCESSING` | `READY_FOR_FULFILLMENT`, `CANCELLED` |
| `READY_FOR_FULFILLMENT` | `OUT_FOR_DELIVERY`, `CANCELLED` |
| `OUT_FOR_DELIVERY` | `COMPLETED`, `FAILED` |
| `COMPLETED` | `REFUNDED` |
| `FAILED` | `PENDING_PAYMENT`, `CANCELLED` |

### Delete Order

```http
DELETE /api/v1/orders/:id
```

**Note:** Only draft orders can be deleted.

---

## Products

### List Products

```http
GET /api/v1/products
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `search` | string | - | Search by name or SKU |
| `category` | string | - | Filter by category ID |
| `active` | boolean | - | Filter by active status |

### Get Product

```http
GET /api/v1/products/:id
```

### Create Product

```http
POST /api/v1/products
```

**Request Body:**

```json
{
  "name": "Malta Guinness 50cl",
  "sku": "MGU-50CL",
  "description": "Premium malt drink",
  "price": 2500,
  "costPrice": 1800,
  "unit": "carton",
  "categoryId": "cat_123",
  "aliases": ["malt", "malta", "guinness"],
  "lowStockThreshold": 20
}
```

### Update Product

```http
PUT /api/v1/products/:id
```

### Delete Product

```http
DELETE /api/v1/products/:id
```

**Note:** Products are soft-deleted (set to inactive).

---

## Customers

### List Customers

```http
GET /api/v1/customers
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `search` | string | - | Search by name, phone, or email |
| `segment` | string | - | Filter by segment |

### Get Customer

```http
GET /api/v1/customers/:id
```

### Create Customer

```http
POST /api/v1/customers
```

**Request Body:**

```json
{
  "name": "Chidinma Eze",
  "phone": "+2348023456789",
  "email": "chidinma@email.com",
  "address": "123 Lagos Street",
  "notes": "VIP customer",
  "tags": ["vip", "wholesale"]
}
```

### Update Customer

```http
PUT /api/v1/customers/:id
```

### Delete Customer

```http
DELETE /api/v1/customers/:id
```

---

## Inventory

### List Inventory

```http
GET /api/v1/inventory
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `lowStock` | boolean | - | Filter low stock items only |

### Get Product Inventory

```http
GET /api/v1/inventory/:productId
```

### Adjust Stock

```http
POST /api/v1/inventory/adjust
```

**Request Body:**

```json
{
  "productId": "prod_123",
  "quantity": 50,
  "type": "IN",
  "notes": "Restocked from supplier"
}
```

**Movement Types:**

| Type | Description |
|------|-------------|
| `IN` | Add stock |
| `OUT` | Remove stock |
| `ADJUSTMENT` | Set stock to specific amount |

### Update Low Stock Threshold

```http
PUT /api/v1/inventory/threshold
```

**Request Body:**

```json
{
  "productId": "prod_123",
  "threshold": 25
}
```

---

## Payments

### List Payments

```http
GET /api/v1/payments
```

### Get Payment

```http
GET /api/v1/payments/:id
```

### Initiate Payment

```http
POST /api/v1/payments/initiate
```

**Request Body:**

```json
{
  "orderId": "ord_123",
  "email": "customer@email.com",
  "amount": 200875,
  "currency": "NGN",
  "callbackUrl": "https://yourapp.com/payment/callback"
}
```

**Response:**

```json
{
  "data": {
    "id": "pay_123",
    "reference": "pay_1234567890",
    "status": "PENDING",
    ...
  },
  "authorization_url": "https://checkout.paystack.com/..."
}
```

### Verify Payment

```http
POST /api/v1/payments/verify/:reference
```

### Process Refund

```http
POST /api/v1/payments/refund/:id
```

**Request Body:**

```json
{
  "reason": "Customer requested refund"
}
```

---

## Conversations

### List Conversations

```http
GET /api/v1/conversations
```

### Get Conversation

```http
GET /api/v1/conversations/:id
```

### Create Conversation

```http
POST /api/v1/conversations
```

**Request Body:**

```json
{
  "customerId": "cust_123",
  "channel": "WHATSAPP",
  "initialMessage": "Hello, I need help with my order"
}
```

### Send Message

```http
POST /api/v1/conversations/send
```

**Request Body:**

```json
{
  "conversationId": "conv_123",
  "content": "Thank you for your message!",
  "messageType": "TEXT"
}
```

### Update Conversation Status

```http
PATCH /api/v1/conversations/:id/status
```

**Request Body:**

```json
{
  "status": "CLOSED"
}
```

---

## Webhooks

### WhatsApp Webhook

**Verification (GET):**

```http
GET /api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

**Events (POST):**

```http
POST /api/v1/webhooks/whatsapp
```

### Paystack Webhook

```http
POST /api/v1/webhooks/paystack
```

---

## Health Checks

### Overall Health

```http
GET /api/v1/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 5
    }
  },
  "version": "1.0.0"
}
```

### Readiness Check

```http
GET /api/v1/health/ready
```

### Liveness Check

```http
GET /api/v1/health/live
```
