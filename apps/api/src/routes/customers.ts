import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateCustomerSchema = CreateCustomerSchema.partial();

// GET /api/v1/customers
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", search, segment } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { phone: { contains: search as string } },
      { email: { contains: search as string, mode: "insensitive" } },
    ];
  }
  if (segment) where.segment = segment as any;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        orders: { select: { id: true, totalAmount: true, createdAt: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.customer.count({ where }),
  ]);

  res.json({
    data: customers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/customers/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      addresses: true,
      prices: { include: { product: true } },
    },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(customer, businessId, "Customer");

  res.json({ data: customer });
});

// POST /api/v1/customers
router.post("/", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = CreateCustomerSchema.parse(req.body);

  // Check for duplicate phone or email
  if (data.phone) {
    const existing = await db.customer.findFirst({
      where: withTenant({ phone: data.phone }, businessId),
    });
    if (existing) {
      throw new AppError("Customer with this phone already exists", 409, "DUPLICATE_CUSTOMER");
    }
  }

  if (data.email) {
    const existing = await db.customer.findFirst({
      where: withTenant({ email: data.email }, businessId),
    });
    if (existing) {
      throw new AppError("Customer with this email already exists", 409, "DUPLICATE_CUSTOMER");
    }
  }

  const customer = await db.customer.create({
    data: {
      businessId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
      tags: data.tags || [],
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "CUSTOMER_CREATED",
      resource: "Customer",
      resourceId: customer.id,
      newValue: customer,
    },
  });

  res.status(201).json({ data: customer });
});

// PUT /api/v1/customers/:id
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;
  const data = UpdateCustomerSchema.parse(req.body);

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(customer, businessId, "Customer");

  const updatedCustomer = await db.customer.update({
    where: { id },
    data,
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "CUSTOMER_UPDATED",
      resource: "Customer",
      resourceId: id,
      oldValue: customer,
      newValue: updatedCustomer,
    },
  });

  res.json({ data: updatedCustomer });
});

// DELETE /api/v1/customers/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(customer, businessId, "Customer");

  await db.customer.delete({ where: { id } });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "CUSTOMER_DELETED",
      resource: "Customer",
      resourceId: id,
    },
  });

  res.status(204).send();
});

export { router as customerRoutes };
