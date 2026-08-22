import { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";

// Import routes
import { orderRoutes } from "../src/routes/orders";
import { productRoutes } from "../src/routes/products";
import { customerRoutes } from "../src/routes/customers";
import { inventoryRoutes } from "../src/routes/inventory";
import { paymentRoutes } from "../src/routes/payments";
import { conversationRoutes } from "../src/routes/conversations";
import { webhookRoutes } from "../src/routes/webhooks";
import { analyticsRoutes } from "../src/routes/analytics";
import { healthRoutes } from "../src/routes/health";
import { businessRoutes } from "../src/routes/auth/business";

// Middleware
import { errorHandler } from "../src/middleware/error-handler";
import { rateLimiter } from "../src/middleware/rate-limiter";
import { tenantResolver } from "../src/middleware/tenant-resolver";

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Business-Id"],
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.headers["x-request-id"] as string);
  next();
});

// Rate limiting
app.use(rateLimiter);

// API Routes
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth/business", businessRoutes);
app.use("/api/v1/orders", tenantResolver, orderRoutes);
app.use("/api/v1/products", tenantResolver, productRoutes);
app.use("/api/v1/customers", tenantResolver, customerRoutes);
app.use("/api/v1/inventory", tenantResolver, inventoryRoutes);
app.use("/api/v1/payments", tenantResolver, paymentRoutes);
app.use("/api/v1/conversations", tenantResolver, conversationRoutes);
app.use("/api/v1/analytics", tenantResolver, analyticsRoutes);

// Webhook routes (no tenant resolver)
app.use("/api/v1/webhooks", webhookRoutes);

// Error handling
app.use(errorHandler);

// Export for Vercel serverless
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Pass to Express
  return app(req, res);
}
