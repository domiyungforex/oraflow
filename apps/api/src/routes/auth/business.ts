import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant } from "@orderflow/db";
import { AppError } from "../../middleware/error-handler";
import { tenantResolver } from "../../middleware/tenant-resolver";

const router = Router();

// Validation schemas
const CreateBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  country: z.string().default("NG"),
  currency: z.string().default("NGN"),
  timezone: z.string().default("Africa/Lagos"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
});

const UpdateBusinessSchema = CreateBusinessSchema.partial();

// GET /api/v1/auth/business - Get current user's business
router.get("/", tenantResolver, async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;

  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      _count: {
        select: {
          products: true,
          customers: true,
          orders: true,
        },
      },
    },
  });

  if (!business) {
    throw new AppError("Business not found", 404, "NOT_FOUND");
  }

  res.json({ data: business });
});

// POST /api/v1/auth/business - Create a new business
router.post("/", async (req: Request, res: Response) => {
  // Get user from auth header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // TODO: Verify Clerk token and get user ID
  // For now, we'll use a placeholder
  const userId = "placeholder_user_id";

  const data = CreateBusinessSchema.parse(req.body);

  // Generate slug from name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Check if slug is unique
  const existing = await db.business.findUnique({ where: { slug } });
  if (existing) {
    // Append a number to make it unique
    const count = await db.business.count({
      where: { slug: { startsWith: slug } },
    });
    const uniqueSlug = `${slug}-${count + 1}`;

    const business = await db.business.create({
      data: {
        name: data.name,
        slug: uniqueSlug,
        industry: data.industry,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        website: data.website,
      },
    });

    // Create business membership for the user
    await db.businessMember.create({
      data: {
        userId,
        businessId: business.id,
        role: "BUSINESS_OWNER",
        isOwner: true,
        acceptedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        businessId: business.id,
        userId,
        action: "BUSINESS_CREATED",
        resource: "Business",
        resourceId: business.id,
        newValue: business,
      },
    });

    res.status(201).json({ data: business });
  } else {
    const business = await db.business.create({
      data: {
        name: data.name,
        slug,
        industry: data.industry,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        website: data.website,
      },
    });

    // Create business membership for the user
    await db.businessMember.create({
      data: {
        userId,
        businessId: business.id,
        role: "BUSINESS_OWNER",
        isOwner: true,
        acceptedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        businessId: business.id,
        userId,
        action: "BUSINESS_CREATED",
        resource: "Business",
        resourceId: business.id,
        newValue: business,
      },
    });

    res.status(201).json({ data: business });
  }
});

// PUT /api/v1/auth/business - Update current user's business
router.put("/", tenantResolver, async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = UpdateBusinessSchema.parse(req.body);

  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) {
    throw new AppError("Business not found", 404, "NOT_FOUND");
  }

  const updatedBusiness = await db.business.update({
    where: { id: businessId },
    data,
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "BUSINESS_UPDATED",
      resource: "Business",
      resourceId: businessId,
      oldValue: business,
      newValue: updatedBusiness,
    },
  });

  res.json({ data: updatedBusiness });
});

// GET /api/v1/auth/business/members - Get business members
router.get("/members", tenantResolver, async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;

  const members = await db.businessMember.findMany({
    where: withTenant({}, businessId),
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: members });
});

// POST /api/v1/auth/business/members/invite - Invite a team member
router.post("/members/invite", tenantResolver, async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const { email, role } = z.object({
    email: z.string().email(),
    role: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
  }).parse(req.body);

  // Check if user is already a member
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await db.businessMember.findFirst({
      where: {
        userId: existingUser.id,
        businessId,
      },
    });

    if (existingMember) {
      throw new AppError("User is already a member", 409, "ALREADY_MEMBER");
    }

    // Add existing user as member
    const member = await db.businessMember.create({
      data: {
        userId: existingUser.id,
        businessId,
        role: role as any,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        businessId,
        userId: req.tenant!.userId,
        action: "MEMBER_INVITED",
        resource: "BusinessMember",
        resourceId: member.id,
        newValue: member,
      },
    });

    res.status(201).json({ data: member });
  } else {
    // User doesn't exist yet - would send invitation email in production
    // For now, create a placeholder user
    const newUser = await db.user.create({
      data: {
        clerkId: `pending_${Date.now()}`,
        email,
        firstName: email.split("@")[0],
      },
    });

    const member = await db.businessMember.create({
      data: {
        userId: newUser.id,
        businessId,
        role: role as any,
        isActive: false, // Inactive until they sign up
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        businessId,
        userId: req.tenant!.userId,
        action: "MEMBER_INVITED",
        resource: "BusinessMember",
        resourceId: member.id,
        newValue: member,
      },
    });

    res.status(201).json({ data: member, message: "Invitation sent" });
  }
});

export { router as businessRoutes };
