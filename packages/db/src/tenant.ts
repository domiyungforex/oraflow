import { Prisma } from "@prisma/client";

/**
 * Tenant-aware where clause helper.
 * Ensures all queries are scoped to the correct business/tenant.
 */
export function tenantWhere(businessId: string): Prisma.BusinessWhereInput {
  return { id: businessId };
}

/**
 * Creates a where clause that enforces tenant isolation.
 * Use this in all queries to prevent cross-tenant data access.
 */
export function withTenant<T extends Record<string, unknown>>(
  where: T,
  businessId: string
): T & { businessId: string } {
  return {
    ...where,
    businessId,
  };
}

/**
 * Validates that a record belongs to the specified tenant.
 * Throws if the record is null or belongs to a different tenant.
 */
export function assertTenantAccess(
  record: { businessId: string } | null,
  businessId: string,
  resource: string
): asserts record is { businessId: string } {
  if (!record) {
    throw new Error(`${resource} not found`);
  }
  if (record.businessId !== businessId) {
    throw new Error("Unauthorized: tenant access violation");
  }
}

/**
 * Type for tenant-scoped models
 */
export type TenantScoped = {
  businessId: string;
};
