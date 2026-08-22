#!/bin/bash

# OrderFlow Deployment Script
# This script helps set up and deploy OrderFlow to Vercel

set -e

echo "🚀 OrderFlow Deployment Helper"
echo "================================"
echo ""

# Check for required tools
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ $1 is not installed. Please install it first."
    exit 1
  fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command git

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

echo "✅ Vercel CLI installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
  echo "📝 Creating .env file from template..."
  cp .env.example .env 2>/dev/null || cp .env.vercel .env 2>/dev/null || true
  echo "⚠️  Please edit .env with your configuration before deploying"
  echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd packages/db
npx prisma generate
cd ../..
echo ""

# Build the web app
echo "🏗️  Building web application..."
cd apps/web
npm run build
cd ../..
echo ""

echo "✅ Build complete!"
echo ""
echo "================================"
echo "📋 Next Steps:"
echo "================================"
echo ""
echo "1. Set up your external services:"
echo "   - PostgreSQL: https://neon.tech (recommended)"
echo "   - Clerk: https://clerk.com"
echo "   - Paystack: https://paystack.com"
echo ""
echo "2. Update your .env file with the service credentials"
echo ""
echo "3. Deploy to Vercel:"
echo "   vercel --prod"
echo ""
echo "4. After deployment, run database setup:"
echo "   cd packages/db && npx prisma db push && npx tsx src/seed.ts"
echo ""
echo "5. Configure webhooks:"
echo "   - Clerk: https://your-app.vercel.app/api/v1/webhooks/clerk"
echo "   - Paystack: https://your-app.vercel.app/api/v1/webhooks/paystack"
echo ""
echo "📚 Full deployment guide: DEPLOY.md"
echo ""
echo "🎉 Happy deploying!"
