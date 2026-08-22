# OrderFlow Database Documentation

## Overview

OrderFlow uses PostgreSQL as the primary database with Prisma ORM for type-safe database access.

## Schema

### Users & Authentication

```sql
users
├── id (String, PK)
├── clerkId (String, Unique)
├── email (String, Unique)
├── firstName (String?)
├── lastName (String?)
├── avatarUrl (String?)
├── phone (String?)
├── createdAt (DateTime)
└── updatedAt (DateTime)
```

### Multi-Tenancy

```sql
businesses
├── id (String, PK)
├── name (String)
├── slug (String, Unique)
├── industry (String?)
├── country (String, default "NG")
├── currency (String, default "NGN")
├── timezone (String, default "Africa/Lagos")
├── address (String?)
├── city (String?)
├── state (String?)
├── logoUrl (String?)
├── phone (String?)
├── email (String?)
├── website (String?)
├── taxRate (Decimal?)
├── deliveryFee (Decimal?)
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

business_members
├── id (String, PK)
├── userId (String, FK → users.id)
├── businessId (String, FK → businesses.id)
├── role (Enum: PLATFORM_OWNER, BUSINESS_OWNER, MANAGER, STAFF)
├── isOwner (Boolean, default false)
├── isActive (Boolean, default true)
├── invitedAt (DateTime)
├── acceptedAt (DateTime?)
├── createdAt (DateTime)
└── updatedAt (DateTime)
```

### Products & Inventory

```sql
product_categories
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── name (String)
├── description (String?)
├── sortOrder (Int, default 0)
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

products
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── categoryId (String?, FK → product_categories.id)
├── name (String)
├── slug (String)
├── sku (String?)
├── description (String?)
├── price (Decimal)
├── costPrice (Decimal?)
├── unit (String, default "piece")
├── imageUrl (String?)
├── isActive (Boolean, default true)
├── aliases (String[])
├── lowStockThreshold (Int?)
├── createdAt (DateTime)
└── updatedAt (DateTime)

inventory
├── id (String, PK)
├── productId (String, Unique, FK → products.id)
├── businessId (String, FK → businesses.id)
├── stockOnHand (Int, default 0)
├── reservedStock (Int, default 0)
├── unit (String, default "piece")
├── lowStockThreshold (Int, default 10)
├── createdAt (DateTime)
└── updatedAt (DateTime)

inventory_movements
├── id (String, PK)
├── inventoryId (String, FK → inventory.id)
├── type (Enum: IN, OUT, ADJUSTMENT, RESERVATION, RELEASE)
├── quantity (Int)
├── reference (String?)
├── notes (String?)
└── createdAt (DateTime)

inventory_reservations
├── id (String, PK)
├── inventoryId (String, FK → inventory.id)
├── orderId (String, FK → orders.id)
├── quantity (Int)
├── expiresAt (DateTime)
└── createdAt (DateTime)
```

### Customers

```sql
customers
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── name (String)
├── phone (String?)
├── email (String?)
├── address (String?)
├── notes (String?)
├── tags (String[])
├── segment (Enum: NEW, ACTIVE, VIP, INACTIVE, HIGH_VALUE, OVERDUE)
├── totalSpend (Decimal, default 0)
├── orderCount (Int, default 0)
├── lastOrderAt (DateTime?)
├── createdAt (DateTime)
└── updatedAt (DateTime)

customer_addresses
├── id (String, PK)
├── customerId (String, FK → customers.id)
├── label (String, default "default")
├── address (String)
├── city (String?)
├── state (String?)
├── country (String?)
└── isDefault (Boolean, default false)

customer_prices
├── id (String, PK)
├── customerId (String, FK → customers.id)
├── productId (String, FK → products.id)
└── price (Decimal)
```

### Orders

```sql
orders
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── customerId (String?, FK → customers.id)
├── orderNumber (String)
├── source (Enum: WHATSAPP, WEB, API, PHONE, IN_STORE)
├── status (Enum: DRAFT, PENDING_CONFIRMATION, PENDING_PAYMENT, PAID, PROCESSING, READY_FOR_FULFILLMENT, OUT_FOR_DELIVERY, COMPLETED, CANCELLED, REFUNDED, FAILED)
├── paymentStatus (Enum: UNPAID, PARTIALLY_PAID, PAID, REFUNDED, FAILED)
├── fulfillmentStatus (Enum: PENDING, PROCESSING, READY, SHIPPED, DELIVERED, FAILED)
├── subtotal (Decimal)
├── discountAmount (Decimal, default 0)
├── taxAmount (Decimal, default 0)
├── deliveryFee (Decimal, default 0)
├── totalAmount (Decimal)
├── notes (String?)
├── internalNotes (String?)
├── confirmedAt (DateTime?)
├── paidAt (DateTime?)
├── fulfilledAt (DateTime?)
├── cancelledAt (DateTime?)
├── cancelReason (String?)
├── conversationId (String?)
├── createdAt (DateTime)
└── updatedAt (DateTime)

order_items
├── id (String, PK)
├── orderId (String, FK → orders.id)
├── productId (String, FK → products.id)
├── quantity (Int)
├── unitPrice (Decimal)
└── total (Decimal)
```

### Payments

```sql
payments
├── id (String, PK)
├── orderId (String, FK → orders.id)
├── businessId (String, FK → businesses.id)
├── provider (Enum: PAYSTACK, STRIPE, FLUTTERWAVE)
├── amount (Decimal)
├── currency (String, default "NGN")
├── status (Enum: PENDING, SUCCESS, FAILED, REFUNDED)
├── reference (String, Unique)
├── providerRef (String?)
├── metadata (Json, default {})
├── paidAt (DateTime?)
├── failedAt (DateTime?)
├── failureReason (String?)
├── createdAt (DateTime)
└── updatedAt (DateTime)

payment_events
├── id (String, PK)
├── paymentId (String, FK → payments.id)
├── type (String)
├── payload (Json)
└── createdAt (DateTime)
```

### Conversations

```sql
conversations
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── customerId (String?, FK → customers.id)
├── channel (Enum: WHATSAPP, WEB, API, SMS, EMAIL, TELEGRAM)
├── status (Enum: ACTIVE, WAITING, CLOSED, ARCHIVED)
├── context (Json, default {})
├── createdAt (DateTime)
└── updatedAt (DateTime)

messages
├── id (String, PK)
├── conversationId (String, FK → conversations.id)
├── direction (Enum: INBOUND, OUTBOUND)
├── content (String)
├── messageType (Enum: TEXT, IMAGE, DOCUMENT, PAYMENT_REQUEST, ORDER_CONFIRMATION, SYSTEM)
├── metadata (Json, default {})
├── sentAt (DateTime)
└── createdAt (DateTime)
```

### Deliveries

```sql
deliveries
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── orderId (String, Unique, FK → orders.id)
├── address (String)
├── recipientName (String?)
├── recipientPhone (String?)
├── driverName (String?)
├── driverPhone (String?)
├── deliveryFee (Decimal?)
├── trackingRef (String?)
├── status (Enum: PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED, CANCELLED)
├── estimatedDate (DateTime?)
├── deliveredAt (DateTime?)
├── createdAt (DateTime)
└── updatedAt (DateTime)
```

### Automation

```sql
automation_rules
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── name (String)
├── description (String?)
├── trigger (Enum: ORDER_CREATED, PAYMENT_RECEIVED, PAYMENT_FAILED, LOW_INVENTORY, CUSTOMER_INACTIVE, DELIVERY_COMPLETED, INVOICE_OVERDUE, MANUAL)
├── conditions (Json, default [])
├── actions (Json, default [])
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

automation_runs
├── id (String, PK)
├── ruleId (String, FK → automation_rules.id)
├── status (Enum: PENDING, RUNNING, COMPLETED, FAILED)
├── input (Json, default {})
├── output (Json, default {})
├── error (String?)
├── startedAt (DateTime?)
├── completedAt (DateTime?)
└── createdAt (DateTime)
```

### Subscriptions & Billing

```sql
subscriptions
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── planId (String)
├── status (Enum: ACTIVE, PAST_DUE, CANCELED, INCOMPLETE, TRIALING)
├── currentPeriodStart (DateTime)
├── currentPeriodEnd (DateTime)
├── cancelAt (DateTime?)
├── canceledAt (DateTime?)
├── usage (Json, default {})
├── createdAt (DateTime)
└── updatedAt (DateTime)

subscription_invoices
├── id (String, PK)
├── subscriptionId (String, FK → subscriptions.id)
├── amount (Decimal)
├── currency (String, default "NGN")
├── status (Enum: PENDING, PAID, FAILED, VOID)
├── paidAt (DateTime?)
├── dueDate (DateTime)
└── createdAt (DateTime)
```

### API & Webhooks

```sql
api_keys
├── id (String, PK)
├── userId (String, FK → users.id)
├── businessId (String?, FK → businesses.id)
├── name (String)
├── keyHash (String, Unique)
├── prefix (String)
├── scopes (String[])
├── isActive (Boolean, default true)
├── lastUsedAt (DateTime?)
├── expiresAt (DateTime?)
└── createdAt (DateTime)

webhook_endpoints
├── id (String, PK)
├── businessId (String, FK → businesses.id)
├── url (String)
├── events (String[])
├── secret (String)
├── isActive (Boolean, default true)
├── createdAt (DateTime)
└── updatedAt (DateTime)

webhook_deliveries
├── id (String, PK)
├── endpointId (String, FK → webhook_endpoints.id)
├── event (String)
├── payload (Json)
├── status (Enum: PENDING, SUCCESS, FAILED)
├── attempts (Int, default 0)
├── lastAttemptAt (DateTime?)
├── successAt (DateTime?)
├── error (String?)
└── createdAt (DateTime)
```

### Audit & Notifications

```sql
audit_logs
├── id (String, PK)
├── businessId (String?, FK → businesses.id)
├── userId (String?, FK → users.id)
├── action (String)
├── resource (String)
├── resourceId (String?)
├── oldValue (Json?)
├── newValue (Json?)
├── ipAddress (String?)
├── userAgent (String?)
└── createdAt (DateTime)

notifications
├── id (String, PK)
├── userId (String?, FK → users.id)
├── businessId (String?, FK → businesses.id)
├── type (Enum: ORDER_CREATED, ORDER_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_FAILED, ORDER_SHIPPED, ORDER_DELIVERED, LOW_INVENTORY, INVOICE_OVERDUE, SYSTEM)
├── title (String)
├── message (String)
├── data (Json, default {})
├── isRead (Boolean, default false)
└── createdAt (DateTime)
```

## Indexes

### Performance Indexes

```sql
-- Orders
CREATE INDEX idx_orders_business_id ON orders(business_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Products
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(business_id, sku);

-- Customers
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(business_id, phone);
CREATE INDEX idx_customers_email ON customers(business_id, email);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_status ON payments(status);

-- Inventory
CREATE INDEX idx_inventory_business_id ON inventory(business_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);

-- Conversations
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

## Migrations

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## Seed Data

Run `npm run db:seed` to populate the database with realistic development data:

- 1 business owner user
- 1 demo business
- 5 product categories
- 20 products
- 20 customers
- 30 orders with various statuses
- 10 conversations with messages
- 3 automation rules
- 1 payment account
- 1 WhatsApp integration
