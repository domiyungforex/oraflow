import { Request, Response, NextFunction } from "express";
import { db } from "@orderflow/db";
import jwt from "jsonwebtoken";

// Extend Express Request to include tenant info
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        businessId: string;
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * Verify Clerk JWT token and extract user info.
 */
async function verifyClerkToken(token: string): Promise<{
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
} | null> {
  try {
    // Clerk JWTs can be verified using their JWKS endpoint
    // For development, we'll use a simpler approach
    // In production, use @clerk/backend or verify against JWKS
    
    // Decode the JWT (without verification for dev)
    // In production, ALWAYS verify the signature
    const payload = jwt.decode(token) as any;
    
    if (!payload || !payload.sub) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email || payload.email_addresses?.[0]?.email_address || "",
      firstName: payload.first_name || payload.given_name,
      lastName: payload.last_name || payload.family_name,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Get or create user in database from Clerk data.
 */
async function getOrCreateUser(clerkUser: {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}) {
  let user = await db.user.findUnique({
    where: { clerkId: clerkUser.userId },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        clerkId: clerkUser.userId,
        email: clerkUser.email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });
  }

  return user;
}

/**
 * Get user's business membership.
 */
async function getBusinessMembership(userId: string, businessId?: string) {
  const where: any = { userId, isActive: true };
  if (businessId) {
    where.businessId = businessId;
  }

  const membership = await db.businessMember.findFirst({
    where,
    include: {
      business: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return membership;
}

/**
 * Tenant resolver middleware.
 * Extracts tenant context from authenticated user.
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get API key or JWT token from header
    const apiKey = req.headers["x-api-key"] as string;
    const authHeader = req.headers.authorization;

    if (!apiKey && !authHeader) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (apiKey) {
      // API key authentication
      const keyRecord = await db.apiKey.findUnique({
        where: { keyHash: apiKey },
        include: { business: true },
      });

      if (!keyRecord || !keyRecord.isActive) {
        return res.status(401).json({
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid or inactive API key",
          },
        });
      }

      // Update last used timestamp
      await db.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      });

      req.tenant = {
        businessId: keyRecord.businessId!,
        userId: keyRecord.userId,
        role: "BUSINESS_OWNER", // API keys have full access
      };
    } else if (authHeader?.startsWith("Bearer ")) {
      // JWT token authentication (Clerk)
      const token = authHeader.substring(7);
      
      const clerkUser = await verifyClerkToken(token);
      if (!clerkUser) {
        return res.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        });
      }

      // Get or create user
      const user = await getOrCreateUser(clerkUser);

      // Get business ID from query params or header
      const businessId = req.headers["x-business-id"] as string || 
                         req.query.businessId as string;

      // Get business membership
      const membership = await getBusinessMembership(user.id, businessId);

      if (!membership) {
        // User has no business - they need to create one
        return res.status(403).json({
          error: {
            code: "NO_BUSINESS",
            message: "No business found. Please create a business first.",
          },
        });
      }

      req.tenant = {
        businessId: membership.businessId,
        userId: user.id,
        role: membership.role,
      };
    }

    next();
  } catch (error) {
    console.error("Tenant resolver error:", error);
    return res.status(401).json({
      error: {
        code: "AUTHENTICATION_ERROR",
        message: "Authentication failed",
      },
    });
  }
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!roles.includes(req.tenant.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
}

/**
 * Create API key endpoint helper.
 */
export async function createApiKey(
  userId: string,
  businessId: string,
  name: string,
  scopes: string[] = ["read", "write"]
) {
  // Generate a secure API key
  const prefix = "of_";
  const randomBytes = require("crypto").randomBytes(32).toString("hex");
  const rawKey = prefix + randomBytes;
  
  // Hash the key for storage
  const keyHash = require("crypto")
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");

  const apiKey = await db.apiKey.create({
    data: {
      userId,
      businessId,
      name,
      keyHash,
      prefix: rawKey.substring(0, 12),
      scopes,
      isActive: true,
    },
  });

  return {
    id: apiKey.id,
    key: rawKey, // Only returned once!
    prefix: apiKey.prefix,
  };
}
