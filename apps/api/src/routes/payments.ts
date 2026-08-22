import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const InitiatePaymentSchema = z.object({
  orderId: z.string(),
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("NGN"),
  callbackUrl: z.string().url().optional(),
});

// GET /api/v1/payments
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", status, orderId } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  if (status) where.status = status as any;
  if (orderId) where.orderId = orderId as string;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        order: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.payment.count({ where }),
  ]);

  res.json({
    data: payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/payments/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      order: true,
      events: true,
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(payment, businessId, "Payment");

  res.json({ data: payment });
});

// POST /api/v1/payments/initiate
router.post("/initiate", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = InitiatePaymentSchema.parse(req.body);

  // Verify order exists and belongs to business
  const order = await db.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(order, businessId, "Order");

  // Check if order already has a pending payment
  const existingPayment = await db.payment.findFirst({
    where: withTenant(
      {
        orderId: data.orderId,
        status: "PENDING",
      },
      businessId
    ),
  });

  if (existingPayment) {
    throw new AppError(
      "Order already has a pending payment",
      400,
      "PAYMENT_EXISTS"
    );
  }

  // Generate unique reference
  const reference = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create payment record
  const payment = await db.payment.create({
    data: {
      orderId: data.orderId,
      businessId,
      provider: "PAYSTACK",
      amount: data.amount,
      currency: data.currency,
      status: "PENDING",
      reference,
    },
    include: {
      order: true,
    },
  });

  // TODO: Initialize Paystack transaction
  // const paystackResponse = await paystack.initializeTransaction({
  //   email: data.email,
  //   amount: data.amount * 100, // Paystack uses kobo
  //   reference,
  //   callback_url: data.callbackUrl,
  // });

  // Update order status
  await db.order.update({
    where: { id: data.orderId },
    data: { status: "PENDING_PAYMENT" },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PAYMENT_INITIATED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: payment,
    },
  });

  // Return payment info (in real implementation, include Paystack authorization URL)
  res.status(201).json({
    data: payment,
    authorization_url: `https://checkout.paystack.com/${reference}`, // Mock
  });
});

// POST /api/v1/payments/verify/:reference
router.post("/verify/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;
  const businessId = req.tenant!.businessId;

  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(payment, businessId, "Payment");

  // TODO: Verify with Paystack
  // const verification = await paystack.verifyTransaction(reference);

  // For now, simulate successful verification
  const updatedPayment = await db.payment.update({
    where: { reference },
    data: {
      status: "SUCCESS",
      paidAt: new Date(),
      providerRef: `psk_${reference}`,
    },
    include: {
      order: true,
    },
  });

  // Update order status
  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentStatus: "PAID",
    },
  });

  // Create payment event
  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "VERIFICATION_SUCCESS",
      payload: updatedPayment,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PAYMENT_VERIFIED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: { status: "SUCCESS" },
    },
  });

  res.json({ data: updatedPayment });
});

// POST /api/v1/payments/refund/:id
router.post("/refund/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const payment = await db.payment.findUnique({
    where: { id },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(payment, businessId, "Payment");

  if (payment.status !== "SUCCESS") {
    throw new AppError(
      "Only successful payments can be refunded",
      400,
      "INVALID_OPERATION"
    );
  }

  // TODO: Process refund with Paystack
  // const refund = await paystack.refundTransaction(payment.providerRef);

  const updatedPayment = await db.payment.update({
    where: { id },
    data: {
      status: "REFUNDED",
    },
    include: {
      order: true,
    },
  });

  // Update order status
  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
    },
  });

  // Create payment event
  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "REFUND",
      payload: { reason: req.body.reason },
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PAYMENT_REFUNDED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: { status: "REFUNDED" },
    },
  });

  res.json({ data: updatedPayment });
});

export { router as paymentRoutes };
