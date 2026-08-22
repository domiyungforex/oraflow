import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "@orderflow/db";
import { whatsappProcessor } from "../services/conversation";

const router = Router();

// WhatsApp webhook verification
router.get("/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp webhook handler
router.post("/whatsapp", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const body = JSON.stringify(req.body);

    // Verify signature
    if (!whatsappProcessor.verifySignature(body, signature)) {
      console.error("WhatsApp webhook signature mismatch");
      return res.sendStatus(403);
    }

    // Process webhook through conversation engine
    await whatsappProcessor.processWebhook(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    res.sendStatus(200); // Always return 200 to prevent retries
  }
});

// Paystack webhook handler
router.post("/paystack", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    const body = JSON.stringify(req.body);

    // Verify signature
    if (process.env.PAYSTACK_SECRET_KEY) {
      const expectedSignature = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(body)
        .digest("base64");

      if (signature !== expectedSignature) {
        console.error("Paystack webhook signature mismatch");
        return res.sendStatus(403);
      }
    }

    const { event, data } = req.body;

    switch (event) {
      case "charge.success":
        await handlePaystackSuccess(data);
        break;
      case "charge.failed":
        await handlePaystackFailure(data);
        break;
      case "refund.created":
        await handlePaystackRefund(data);
        break;
      default:
        console.log(`Unhandled Paystack event: ${event}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook error:", error);
    res.sendStatus(200); // Always return 200 to prevent retries
  }
});

// Handle successful Paystack payment
async function handlePaystackSuccess(data: any) {
  const { reference, amount, status } = data;

  // Find payment by reference
  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    console.error(`Payment not found for reference: ${reference}`);
    return;
  }

  // Check idempotency - already processed
  if (payment.status === "SUCCESS") {
    return;
  }

  // Update payment status
  await db.payment.update({
    where: { reference },
    data: {
      status: "SUCCESS",
      paidAt: new Date(data.paid_at),
      providerRef: data.id?.toString(),
      metadata: data,
    },
  });

  // Update order status
  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "PAID",
      paidAt: new Date(data.paid_at),
      paymentStatus: "PAID",
    },
  });

  // Create payment event
  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "CHARGE_SUCCESS",
      payload: data,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId: payment.businessId,
      action: "PAYMENT_RECEIVED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: { status: "SUCCESS", amount },
    },
  });

  console.log(`Payment successful: ${reference}`);
}

// Handle failed Paystack payment
async function handlePaystackFailure(data: any) {
  const { reference } = data;

  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    console.error(`Payment not found for reference: ${reference}`);
    return;
  }

  await db.payment.update({
    where: { reference },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason: data.gateway_response,
      metadata: data,
    },
  });

  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "CHARGE_FAILED",
      payload: data,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId: payment.businessId,
      action: "PAYMENT_FAILED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: { status: "FAILED", reason: data.gateway_response },
    },
  });

  console.log(`Payment failed: ${reference}`);
}

// Handle Paystack refund
async function handlePaystackRefund(data: any) {
  const { reference } = data;

  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    console.error(`Payment not found for reference: ${reference}`);
    return;
  }

  await db.payment.update({
    where: { reference },
    data: {
      status: "REFUNDED",
      metadata: data,
    },
  });

  await db.paymentEvent.create({
    data: {
      paymentId: payment.id,
      type: "REFUND",
      payload: data,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId: payment.businessId,
      action: "PAYMENT_REFUNDED",
      resource: "Payment",
      resourceId: payment.id,
      newValue: { status: "REFUNDED" },
    },
  });

  console.log(`Payment refunded: ${reference}`);
}

export { router as webhookRoutes };
