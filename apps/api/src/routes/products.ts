import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive(),
  costPrice: z.number().min(0).optional(),
  unit: z.string().default("piece"),
  categoryId: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
});

const UpdateProductSchema = CreateProductSchema.partial();

// GET /api/v1/products
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", search, category, active } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { sku: { contains: search as string, mode: "insensitive" } },
    ];
  }
  if (category) where.categoryId = category as string;
  if (active !== undefined) where.isActive = active === "true";

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.product.count({ where }),
  ]);

  res.json({
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/products/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      inventory: true,
      customerPrices: true,
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(product, businessId, "Product");

  res.json({ data: product });
});

// POST /api/v1/products
router.post("/", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = CreateProductSchema.parse(req.body);

  // Generate slug from name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Create product
  const product = await db.product.create({
    data: {
      businessId,
      name: data.name,
      slug,
      sku: data.sku,
      description: data.description,
      price: data.price,
      costPrice: data.costPrice,
      unit: data.unit,
      categoryId: data.categoryId,
      aliases: data.aliases || [],
      lowStockThreshold: data.lowStockThreshold,
      imageUrl: data.imageUrl,
    },
    include: {
      category: true,
    },
  });

  // Create inventory record
  await db.inventory.create({
    data: {
      productId: product.id,
      businessId,
      stockOnHand: 0,
      reservedStock: 0,
      unit: data.unit,
      lowStockThreshold: data.lowStockThreshold || 10,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PRODUCT_CREATED",
      resource: "Product",
      resourceId: product.id,
      newValue: product,
    },
  });

  res.status(201).json({ data: product });
});

// PUT /api/v1/products/:id
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;
  const data = UpdateProductSchema.parse(req.body);

  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(product, businessId, "Product");

  const updatedProduct = await db.product.update({
    where: { id },
    data,
    include: {
      category: true,
      inventory: true,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PRODUCT_UPDATED",
      resource: "Product",
      resourceId: id,
      oldValue: product,
      newValue: updatedProduct,
    },
  });

  res.json({ data: updatedProduct });
});

// DELETE /api/v1/products/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.tenant!.businessId;

  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  assertTenantAccess(product, businessId, "Product");

  // Soft delete - set isActive to false
  await db.product.update({
    where: { id },
    data: { isActive: false },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: "PRODUCT_DELETED",
      resource: "Product",
      resourceId: id,
    },
  });

  res.status(204).send();
});

export { router as productRoutes };
