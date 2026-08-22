import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";

// Import routes
import { orderRoutes } from "./routes/orders";
import { productRoutes } from "./routes/products";
import { customerRoutes } from "./routes/customers";
import { inventoryRoutes } from "./routes/inventory";
import { paymentRoutes } from "./routes/payments";
import { conversationRoutes } from "./routes/conversations";
import { webhookRoutes } from "./routes/webhooks";
import { analyticsRoutes } from "./routes/analytics";
import { healthRoutes } from "./routes/health";
import { businessRoutes } from "./routes/auth/business";

// Middleware
import { errorHandler } from "./middleware/error-handler";
import { rateLimiter } from "./middleware/rate-limiter";
import { tenantResolver } from "./middleware/tenant-resolver";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("combined"));

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

// Webhook routes (no tenant resolver - webhooks come from external services)
app.use("/api/v1/webhooks", webhookRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OrderFlow API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
});

export default app;
