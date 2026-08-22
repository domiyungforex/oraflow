import { Router, Request, Response } from "express";
import { db, withTenant } from "@orderflow/db";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

const router = Router();

// GET /api/v1/analytics/overview
router.get("/overview", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const { period = "30d" } = req.query;

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = startOfDay(now);
      break;
    case "week":
      startDate = startOfWeek(now);
      break;
    case "month":
      startDate = startOfMonth(now);
      break;
    case "30d":
    default:
      startDate = subDays(now, 30);
      break;
  }

  // Get total revenue
  const revenueResult = await db.payment.aggregate({
    where: withTenant(
      {
        status: "SUCCESS",
        createdAt: { gte: startDate },
      },
      businessId
    ),
    _sum: { amount: true },
  });

  // Get total orders
  const totalOrders = await db.order.count({
    where: withTenant(
      {
        createdAt: { gte: startDate },
      },
      businessId
    ),
  });

  // Get paid orders
  const paidOrders = await db.order.count({
    where: withTenant(
      {
        paymentStatus: "PAID",
        createdAt: { gte: startDate },
      },
      businessId
    ),
  });

  // Get average order value
  const avgOrderValue = await db.order.aggregate({
    where: withTenant(
      {
        paymentStatus: "PAID",
        createdAt: { gte: startDate },
      },
      businessId
    ),
    _avg: { totalAmount: true },
  });

  // Get unique customers
  const uniqueCustomers = await db.customer.count({
    where: withTenant(
      {
        orders: {
          some: {
            createdAt: { gte: startDate },
          },
        },
      },
      businessId
    ),
  });

  res.json({
    data: {
      revenue: revenueResult._sum.amount || 0,
      totalOrders,
      paidOrders,
      averageOrderValue: avgOrderValue._avg.totalAmount || 0,
      uniqueCustomers,
      conversionRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
    },
  });
});

// GET /api/v1/analytics/revenue
router.get("/revenue", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const { days = "30" } = req.query;

  const now = new Date();
  const startDate = subDays(now, Number(days));

  // Get daily revenue
  const payments = await db.payment.findMany({
    where: withTenant(
      {
        status: "SUCCESS",
        createdAt: { gte: startDate },
      },
      businessId
    ),
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // Group by day
  const dailyRevenue: Record<string, number> = {};
  for (let i = 0; i < Number(days); i++) {
    const date = subDays(now, i);
    const dateStr = date.toISOString().split("T")[0];
    dailyRevenue[dateStr] = 0;
  }

  for (const payment of payments) {
    const dateStr = payment.createdAt.toISOString().split("T")[0];
    if (dailyRevenue[dateStr] !== undefined) {
      dailyRevenue[dateStr] += Number(payment.amount);
    }
  }

  const data = Object.entries(dailyRevenue)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ data });
});

// GET /api/v1/analytics/orders
router.get("/orders", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const { days = "30" } = req.query;

  const now = new Date();
  const startDate = subDays(now, Number(days));

  const orders = await db.order.findMany({
    where: withTenant(
      {
        createdAt: { gte: startDate },
      },
      businessId
    ),
    select: {
      status: true,
      createdAt: true,
    },
  });

  // Group by day
  const dailyOrders: Record<string, number> = {};
  for (let i = 0; i < Number(days); i++) {
    const date = subDays(now, i);
    const dateStr = date.toISOString().split("T")[0];
    dailyOrders[dateStr] = 0;
  }

  for (const order of orders) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    if (dailyOrders[dateStr] !== undefined) {
      dailyOrders[dateStr]++;
    }
  }

  const data = Object.entries(dailyOrders)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ data });
});

// GET /api/v1/analytics/top-products
router.get("/top-products", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const { limit = "10" } = req.query;

  const topProducts = await db.orderItem.groupBy({
    by: ["productId"],
    where: withTenant(
      {
        order: {
          paymentStatus: "PAID",
        },
      },
      businessId
    ),
    _sum: {
      quantity: true,
      total: true,
    },
    _count: true,
    orderBy: {
      _sum: { total: "desc" },
    },
    take: Number(limit),
  });

  // Get product details
  const productIds = topProducts.map((p) => p.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const data = topProducts.map((item) => ({
    product: productMap.get(item.productId),
    totalSold: item._sum.quantity,
    totalRevenue: item._sum.total,
    orderCount: item._count,
  }));

  res.json({ data });
});

// GET /api/v1/analytics/customers
router.get("/customers", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;

  // Get customer segments
  const segments = await db.customer.groupBy({
    by: ["segment"],
    where: withTenant({}, businessId),
    _count: true,
  });

  // Get repeat customers
  const repeatCustomers = await db.customer.findMany({
    where: withTenant(
      {
        orderCount: { gt: 1 },
      },
      businessId
    ),
    select: {
      id: true,
      name: true,
      orderCount: true,
      totalSpend: true,
    },
    orderBy: { orderCount: "desc" },
    take: 10,
  });

  // Get new customers this month
  const startOfMonthDate = startOfMonth(new Date());
  const newCustomersThisMonth = await db.customer.count({
    where: withTenant(
      {
        createdAt: { gte: startOfMonthDate },
      },
      businessId
    ),
  });

  res.json({
    data: {
      segments: segments.map((s) => ({
        segment: s.segment,
        count: s._count,
      })),
      repeatCustomers,
      newCustomersThisMonth,
    },
  });
});

// GET /api/v1/analytics/fulfillment
router.get("/fulfillment", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;

  const fulfillmentStats = await db.order.groupBy({
    by: ["fulfillmentStatus"],
    where: withTenant({}, businessId),
    _count: true,
  });

  // Calculate average fulfillment time
  const completedOrders = await db.order.findMany({
    where: withTenant(
      {
        fulfillmentStatus: "DELIVERED",
        fulfilledAt: { not: null },
        paidAt: { not: null },
      },
      businessId
    ),
    select: {
      paidAt: true,
      fulfilledAt: true,
    },
  });

  let avgFulfillmentTime = 0;
  if (completedOrders.length > 0) {
    const totalTime = completedOrders.reduce((sum, order) => {
      const time = order.fulfilledAt!.getTime() - order.paidAt!.getTime();
      return sum + time;
    }, 0);
    avgFulfillmentTime = totalTime / completedOrders.length / (1000 * 60 * 60); // Convert to hours
  }

  res.json({
    data: {
      stats: fulfillmentStats.map((s) => ({
        status: s.fulfillmentStatus,
        count: s._count,
      })),
      avgFulfillmentTimeHours: avgFulfillmentTime,
    },
  });
});

export { router as analyticsRoutes };
