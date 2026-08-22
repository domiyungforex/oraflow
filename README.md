# OrderFlow

**Turn customer conversations into completed business transactions.**

OrderFlow is a production-grade, multi-tenant business automation platform that helps businesses receive orders through WhatsApp, web chat, API, and other channels. The AI understands customer messages, identifies products, validates inventory, creates orders, handles payments, and keeps customers informed.

## Features

- **WhatsApp Ordering** - Customers send orders via WhatsApp
- **AI-Powered** - Natural language understanding for order extraction
- **Payment Processing** - Integrated with Paystack (Stripe coming soon)
- **Inventory Management** - Real-time stock tracking and alerts
- **Order Management** - Full order lifecycle from creation to fulfillment
- **Multi-Tenant** - Secure isolation between businesses
- **Analytics** - Business intelligence and insights
- **Automation** - Workflow engine for business processes

## Tech Stack

- **Frontend**: Next.js, TypeScript, React, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL, Prisma ORM
- **Cache**: Redis
- **AI**: Anthropic/OpenAI with abstraction layer
- **Payments**: Paystack (with provider abstraction)
- **Messaging**: WhatsApp Business Cloud API (with provider abstraction)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for containerized development)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/orderflow.git
cd orderflow

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec api npx prisma migrate dev

# Seed the database
docker-compose exec api npx tsx packages/db/src/seed.ts

# Open the app
open http://localhost:3000
```

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start PostgreSQL and Redis**
   - Use Docker: `docker-compose up -d postgres redis`
   - Or install locally

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Seed the database**
   ```bash
   npm run db:seed
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

7. **Open the app**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Project Structure

```
orderflow/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities
│   │   │   └── hooks/         # Custom hooks
│   │   └── public/            # Static assets
│   └── api/                    # Express API server
│       └── src/
│           ├── routes/        # API routes
│           ├── middleware/     # Express middleware
│           └── services/      # Business logic
├── packages/
│   ├── db/                     # Prisma schema & client
│   ├── ai/                     # AI abstraction layer
│   ├── payments/               # Payment provider abstraction
│   ├── messaging/              # Messaging provider abstraction
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared UI components
│   └── config/                 # Shared configuration
├── infrastructure/
│   └── docker/                 # Docker configurations
├── docs/                       # Documentation
└── tests/                      # Test files
```

## API Documentation

### Authentication

All API requests require authentication via API key or JWT token:

```bash
# Using API key
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/v1/orders

# Using JWT token
curl -H "Authorization: Bearer your-token" http://localhost:3001/api/v1/orders
```

### Endpoints

#### Orders
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id/status` - Update order status
- `DELETE /api/v1/orders/:id` - Delete draft order

#### Products
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Soft delete product

#### Customers
- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/:id` - Get customer details
- `POST /api/v1/customers` - Create customer
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

#### Inventory
- `GET /api/v1/inventory` - List inventory
- `GET /api/v1/inventory/:productId` - Get product inventory
- `POST /api/v1/inventory/adjust` - Adjust stock
- `PUT /api/v1/inventory/threshold` - Update low stock threshold

#### Payments
- `GET /api/v1/payments` - List payments
- `GET /api/v1/payments/:id` - Get payment details
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/verify/:reference` - Verify payment
- `POST /api/v1/payments/refund/:id` - Process refund

#### Conversations
- `GET /api/v1/conversations` - List conversations
- `GET /api/v1/conversations/:id` - Get conversation details
- `POST /api/v1/conversations` - Create conversation
- `POST /api/v1/conversations/send` - Send message
- `PATCH /api/v1/conversations/:id/status` - Update status

#### Webhooks
- `POST /api/v1/webhooks/whatsapp` - WhatsApp webhook
- `POST /api/v1/webhooks/paystack` - Paystack webhook

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Deployment

### Vercel (Frontend)

```bash
# Deploy to Vercel
vercel --prod
```

### Docker (Backend)

```bash
# Build and push images
docker build -t orderflow-api -f infrastructure/docker/Dockerfile.api .
docker build -t orderflow-web -f infrastructure/docker/Dockerfile.web .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@orderflow.com or join our Slack community.
