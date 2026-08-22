import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const SendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
  messageType: z.enum(["TEXT", "IMAGE", "DOCUMENT"]).default("TEXT"),
});

const CreateConversationSchema = z.object({
  customerId: z.string().optional(),
  channel: z.enum(["WHATSAPP", "WEB", "API", "SMS", "EMAIL", "TELEGRAM"]),
  initialMessage: z.string().optional(),
});

// GET /api/v1/conversations
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", status, channel } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  if (status) where.status = status as any;
  if (channel) where.channel = channel as any;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [conversations, total] = await Promise.all([
    db.conversation.findMany({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    db.conversation.count({ where }),
  ]);

  res.json({
    data: conversations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/conversations/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      messages: {
        orderBy: { sentAt: "asc" },
      },
      order: true,
    },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(conversation, businessId, "Conversation");

  res.json({ data: conversation });
});

// POST /api/v1/conversations
router.post("/", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = CreateConversationSchema.parse(req.body);

  const conversation = await db.conversation.create({
    data: {
      businessId,
      customerId: data.customerId,
      channel: data.channel,
      status: "ACTIVE",
    },
    include: {
      customer: true,
    },
  });

  // Add initial message if provided
  if (data.initialMessage) {
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        content: data.initialMessage,
        messageType: "TEXT",
      },
    });
  }

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "CONVERSATION_CREATED",
      resource: "Conversation",
      resourceId: conversation.id,
      newValue: conversation,
    },
  });

  res.status(201).json({ data: conversation });
});

// POST /api/v1/conversations/send
router.post("/send", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = SendMessageSchema.parse(req.body);

  const conversation = await db.conversation.findUnique({
    where: { id: data.conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(conversation, businessId, "Conversation");

  // Create message
  const message = await db.message.create({
    data: {
      conversationId: data.conversationId,
      direction: "OUTBOUND",
      content: data.content,
      messageType: data.messageType,
    },
  });

  // TODO: Send message via WhatsApp/SMS/etc
  // await messagingService.send(conversation.channel, conversation.customerId, data.content);

  // Update conversation timestamp
  await db.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  });

  res.status(201).json({ data: message });
});

// PATCH /api/v1/conversations/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;
  const { status } = z.object({ status: z.enum(["ACTIVE", "WAITING", "CLOSED", "ARCHIVED"]) }).parse(req.body);

  const conversation = await db.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw new AppError("Conversation not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(conversation, businessId, "Conversation");

  const updated = await db.conversation.update({
    where: { id },
    data: { status },
    include: {
      customer: true,
    },
  });

  res.json({ data: updated });
});

export { router as conversationRoutes };
