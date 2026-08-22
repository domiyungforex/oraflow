import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const CreateOrderSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
  notes: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
});

const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "DRAFT", "PENDING_CONFIRMATION", "PENDING_PAYMENT", "PAID",
    "PROCESSING", "READY_FOR_FULFILLMENT", "OUT_FOR_DELIVERY",
    "COMPLETED", "CANCELLED", "REFUNDED", "FAILED",
  ]),
  reason: z.string().optional(),
});

// GET /api/v1/orders
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", status, search } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  if (status) where.status = status as any;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search as string, mode: "insensitive" } },
      { customer: { name: { contains: search as string, mode: "insensitive" } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.order.count({ where }),
  ]);

  res.json({
    data: orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/orders/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: true,
      delivery: true,
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(order, businessId, "Order");

  res.json({ data: order });
});

// POST /api/v1/orders
router.post("/", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = CreateOrderSchema.parse(req.body);

  // Validate products exist and belong to business
  const productIds = data.items.map((item) => item.productId);
  const products = await db.product.findMany({
    where: withTenant({ id: { in: productIds } }, businessId),
  });

  if (products.length !== productIds.length) {
    throw new AppError("One or more products not found", 400, "INVALID_PRODUCTS");
  }

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const business = await db.business.findUnique({ where: { id: businessId } });
  const taxRate = business?.taxRate ? Number(business.taxRate) / 100 : 0;
  const taxAmount = subtotal * taxRate;
  const deliveryFee = data.deliveryFee || 0;
  const totalAmount = subtotal + taxAmount + deliveryFee;

  // Generate order number
  const lastOrder = await db.order.findFirst({
    where: withTenant({}, businessId),
    orderBy: { createdAt: "desc" },
  });
  const orderNumber = `ORD-${String((lastOrder ? parseInt(lastOrder.orderNumber.replace("ORD-", "")) : 0) + 1).padStart(4, "0")}`;

  // Create order with items
  const order = await db.order.create({
    data: {
      businessId,
      customerId: data.customerId,
      orderNumber,
      source: "WEB",
      status: "DRAFT",
      subtotal,
      taxAmount,
      deliveryFee,
      totalAmount,
      notes: data.notes,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "ORDER_CREATED",
      resource: "Order",
      resourceId: order.id,
      newValue: order,
    },
  });

  res.status(201).json({ data: order });
});

// PATCH /api/v1/orders/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;
  const data = UpdateOrderStatusSchema.parse(req.body);

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(order, businessId, "Order");

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    DRAFT: ["PENDING_CONFIRMATION", "CANCELLED"],
    PENDING_CONFIRMATION: ["PENDING_PAYMENT", "CANCELLED"],
    PENDING_PAYMENT: ["PAID", "CANCELLED"],
    PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
    PROCESSING: ["READY_FOR_FULFILLMENT", "CANCELLED"],
    READY_FOR_FULFILLMENT: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["COMPLETED", "FAILED"],
    COMPLETED: ["REFUNDED"],
    CANCELLED: [],
    REFUNDED: [],
    FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  };

  if (!validTransitions[order.status]?.includes(data.status)) {
    throw new AppError(
      `Cannot transition from ${order.status} to ${data.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updateData: any = {
    status: data.status,
  };

  // Set timestamps based on status
  if (data.status === "PAID") updateData.paidAt = new Date();
  if (data.status === "COMPLETED") updateData.fulfilledAt = new Date();
  if (data.status === "CANCELLED") {
    updateData.cancelledAt = new Date();
    updateData.cancelReason = data.reason;
  }

  const updatedOrder = await db.order.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: `ORDER_${data.status}`,
      resource: "Order",
      resourceId: id,
      oldValue: { status: order.status },
      newValue: { status: data.status },
    },
  });

  res.json({ data: updatedOrder });
});

// DELETE /api/v1/orders/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(order, businessId, "Order");

  // Only allow deleting draft orders
  if (order.status !== "DRAFT") {
    throw new AppError(
      "Only draft orders can be deleted",
      400,
      "INVALID_OPERATION"
    );
  }

  await db.order.delete({ where: { id } });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "ORDER_DELETED",
      resource: "Order",
      resourceId: id,
    },
  });

  res.status(204).send();
});

export { router as orderRoutes };
