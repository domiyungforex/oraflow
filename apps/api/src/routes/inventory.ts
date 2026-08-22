import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, withTenant, assertTenantAccess } from "@orderflow/db";
import { AppError } from "../middleware/error-handler";

const router = Router();

// Validation schemas
const AdjustStockSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  notes: z.string().optional(),
});

const UpdateThresholdSchema = z.object({
  productId: z.string(),
  threshold: z.number().int().min(0),
});

// GET /api/v1/inventory
router.get("/", async (req: Request, res: Response) => {
  const { page = "1", limit = "20", lowStock } = req.query;
  const businessId = req.tenant!.businessId;

  const where = withTenant({}, businessId);
  
  // Filter low stock items
  if (lowStock === "true") {
    where.stockOnHand = { lte: db.inventory.fields.lowStockThreshold as any };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [inventory, total] = await Promise.all([
    db.inventory.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    db.inventory.count({ where }),
  ]);

  res.json({
    data: inventory,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/v1/inventory/:productId
router.get("/:productId", async (req: Request, res: Response) => {
  const { productId } = req.params;
  const businessId = req.tenant!.businessId;

  const inventory = await db.inventory.findUnique({
    where: { productId },
    include: {
      product: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(inventory, businessId, "Inventory");

  res.json({ data: inventory });
});

// POST /api/v1/inventory/adjust
router.post("/adjust", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = AdjustStockSchema.parse(req.body);

  const inventory = await db.inventory.findUnique({
    where: { productId: data.productId },
  });

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(inventory, businessId, "Inventory");

  // Calculate new stock level
  let newStock = inventory.stockOnHand;
  if (data.type === "IN") {
    newStock += data.quantity;
  } else if (data.type === "OUT") {
    if (inventory.available < data.quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${inventory.available}`,
        400,
        "INSUFFICIENT_STOCK"
      );
    }
    newStock -= data.quantity;
  } else {
    // ADJUSTMENT
    newStock = data.quantity;
  }

  // Update inventory in transaction
  const result = await db.$transaction([
    db.inventory.update({
      where: { productId: data.productId },
      data: { stockOnHand: newStock },
    }),
    db.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
      },
    }),
  ]);

  // Create audit log
  await db.auditLog.create({
    data: {
      businessId,
      userId: req.tenant!.userId,
      action: `INVENTORY_${data.type}`,
      resource: "Inventory",
      resourceId: inventory.id,
      oldValue: { stockOnHand: inventory.stockOnHand },
      newValue: { stockOnHand: newStock },
    },
  });

  res.json({ data: result[0] });
});

// PUT /api/v1/inventory/threshold
router.put("/threshold", async (req: Request, res: Response) => {
  const businessId = req.tenant!.businessId;
  const data = UpdateThresholdSchema.parse(req.body);

  const inventory = await db.inventory.findUnique({
    where: { productId: data.productId },
  });

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(inventory, businessId, "Inventory");

  const updated = await db.inventory.update({
    where: { productId: data.productId },
    data: { lowStockThreshold: data.threshold },
  });

  res.json({ data: updated });
});

// GET /api/v1/inventory/movements/:productId
router.get("/movements/:productId", async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { page = "1", limit = "50" } = req.query;
  const businessId = req.tenant!.businessId;

  const inventory = await db.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "NOT_FOUND");
  }

  assertTenantAccess(inventory, businessId, "Inventory");

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [movements, total] = await Promise.all([
    db.inventoryMovement.findMany({
      where: { inventoryId: inventory.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.inventoryMovement.count({
      where: { inventoryId: inventory.id },
    }),
  ]);

  res.json({
    data: movements,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export { router as inventoryRoutes };
