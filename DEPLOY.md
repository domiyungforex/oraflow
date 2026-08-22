# OrderFlow Deployment Guide

## Overview

This guide covers deploying OrderFlow on Vercel with external services for the database and cache.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL                              │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js)        │  API (Express Serverless)  │
│  - Landing page            │  - REST API endpoints      │
│  - Dashboard               │  - Webhook handlers        │
│  - Auth (Clerk)            │  - Business logic          │
└────────────┬───────────────┴────────────┬──────────────┘
             │                            │
             ▼                            ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│   Clerk (Auth)      │    │   External Services         │
│   - User management │    │   - PostgreSQL (Neon)       │
│   - JWT tokens      │    │   - Redis (Upstash)         │
└─────────────────────┘    │   - Paystack (Payments)     │
                           │   - WhatsApp (Messaging)     │
                           └─────────────────────────────┘
```

## Prerequisites

1. **Vercel account** - https://vercel.com
2. **Clerk account** - https://clerk.com (for authentication)
3. **PostgreSQL database** - Use one of:
   - [Neon](https://neon.tech) (recommended - serverless PostgreSQL)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)
4. **Paystack account** - https://paystack.com (for payments)
5. **WhatsApp Business account** (optional - for WhatsApp ordering)

## Step 1: Set Up External Services

### 1.1 Create PostgreSQL Database (Neon)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://user:pass@host/dbname?sslmode=require`)
4. Save this as `DATABASE_URL`

### 1.2 Set Up Clerk (Authentication)

1. Sign up at https://clerk.com
2. Create a new application
3. Copy the keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)
4. Go to Webhooks and create a new webhook:
   - URL: `https://your-api.vercel.app/api/v1/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
5. Copy the **Webhook Signing Secret**

### 1.3 Set Up Paystack (Payments)

1. Sign up at https://paystack.com
2. Go to Settings > API Keys
3. Copy:
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)
   - **Public Key** (starts with `pk_live_` or `pk_test_`)
4. Go to Settings > Webhooks
5. Add webhook URL: `https://your-api.vercel.app/api/v1/webhooks/paystack`
6. Copy the **Webhook Secret**

## Step 2: Deploy to Vercel

### 2.1 Push to GitHub

```bash
cd orderflow
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/orderflow.git
git push -u origin main
```

### 2.2 Import to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (monorepo root)
   - **Build Command**: `cd apps/web && npm run build`
   - **Output Directory**: `apps/web/.next`

### 2.3 Add Environment Variables

Go to your Vercel project > Settings > Environment Variables and add:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=...

# App URLs (update with your actual Vercel URLs)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
API_URL=https://your-app.vercel.app

# Node Environment
NODE_ENV=production
```

### 2.4 Deploy

Click **Deploy** and wait for the build to complete.

## Step 3: Set Up Database

After deployment, you need to run the database migrations and seed:

### 3.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 3.2 Link to your project

```bash
cd orderflow
vercel link
```

### 3.3 Run migrations

```bash
# Generate Prisma client
cd packages/db
npx prisma generate

# Push schema to database
npx prisma db push
```

### 3.4 Seed the database

```bash
cd packages/db
npx tsx src/seed.ts
```

## Step 4: Configure Webhooks

### 4.1 Clerk Webhook

1. Go to Clerk Dashboard > Webhooks
2. Update the webhook URL to: `https://your-app.vercel.app/api/v1/webhooks/clerk`
3. Make sure these events are enabled:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### 4.2 Paystack Webhook

1. Go to Paystack Dashboard > Settings > Webhooks
2. Update the webhook URL to: `https://your-app.vercel.app/api/v1/webhooks/paystack`

## Step 5: Set Up Custom Domain (Optional)

1. Go to Vercel > Your Project > Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update environment variables with the new domain:
   - `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
   - `NEXT_PUBLIC_API_URL=https://yourdomain.com`

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | ✅ | Clerk webhook signing secret |
| `PAYSTACK_SECRET_KEY` | ✅ | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | ✅ | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | ✅ | Paystack webhook secret |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app's public URL |
| `NEXT_PUBLIC_API_URL` | ✅ | Your API's public URL |
| `WHATSAPP_ACCESS_TOKEN` | ❌ | WhatsApp Business API token |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ | WhatsApp phone number ID |
| `WHATSAPP_APP_SECRET` | ❌ | WhatsApp app secret |
| `REDIS_URL` | ❌ | Redis connection string |

## Troubleshooting

### Build Fails

1. Check that all environment variables are set
2. Ensure the database is accessible from Vercel's servers
3. Check build logs for specific errors

### API Returns 401

1. Verify Clerk keys are correct
2. Check that the webhook secret matches
3. Ensure the user exists in Clerk

### Database Connection Issues

1. Ensure your database allows connections from Vercel's IP ranges
2. Check that `DATABASE_URL` is correct
3. Verify SSL mode is enabled (add `?sslmode=require` if needed)

### Webhook Not Working

1. Check the webhook URL is correct
2. Verify the signing secret matches
3. Check Vercel function logs for errors

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in your project settings to track:
- Page views
- Performance
- Web Vitals

### Error Tracking

Consider adding error tracking:
- [Sentry](https://sentry.io)
- [LogRocket](https://logrocket.com)

### Database Monitoring

- Neon: Built-in dashboard
- Supabase: Database logs in dashboard
- Railway: Metrics in dashboard

## Scaling

Vercel automatically scales:
- **Frontend**: Edge network, automatic CDN
- **API**: Serverless functions, scales to zero when not in use

For database scaling:
- Neon: Auto-scaling compute
- Supabase: Upgrade plan for more connections
- Railway: Scale instance size

## Cost Estimate

### Vercel (Hobby Plan - Free)
- Frontend: Unlimited
- API: 100GB bandwidth/month
- Serverless: 100 hours/month

### Neon (Free Tier)
- 0.5 GB storage
- 24/7 compute (50 hours/month)

### Clerk (Free Tier)
- 10,000 monthly active users

### Paystack
- 1.5% + ₦100 per transaction

## Next Steps

1. ✅ Set up monitoring
2. ✅ Configure error tracking
3. ✅ Set up CI/CD
4. ✅ Add custom domain
5. ✅ Enable SSL
6. ✅ Set up backups
