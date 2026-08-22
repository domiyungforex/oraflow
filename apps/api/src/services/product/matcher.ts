import { db, withTenant } from "@orderflow/db";

export interface ProductMatch {
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  costPrice: number | null;
  unit: string;
  aliases: string[];
  score: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Product matching service that resolves natural language product queries
 * to actual products in the database.
 */
export class ProductMatcher {
  /**
   * Find matching products for a query string.
   * Uses multiple matching strategies:
   * 1. Exact name match
   * 2. Alias match
   * 3. SKU match
   * 4. Fuzzy string similarity
   */
  async findMatches(
    query: string,
    businessId: string,
    limit: number = 5
  ): Promise<ProductMatch[]> {
    const normalizedQuery = this.normalize(query);
    
    // Get all active products for the business
    const products = await db.product.findMany({
      where: withTenant({ isActive: true }, businessId),
      include: {
        inventory: true,
      },
    });

    const matches: ProductMatch[] = [];

    for (const product of products) {
      const match = this.scoreProduct(normalizedQuery, product);
      if (match.score > 0.2) {
        matches.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          costPrice: product.costPrice ? Number(product.costPrice) : null,
          unit: product.unit,
          aliases: product.aliases,
          score: match.score,
          confidence: match.score > 0.7 ? "high" : match.score > 0.4 ? "medium" : "low",
          reason: match.reason,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  /**
   * Find the best single match for a product query.
   * Returns null if no good match is found.
   */
  async findBestMatch(
    query: string,
    businessId: string
  ): Promise<ProductMatch | null> {
    const matches = await this.findMatches(query, businessId, 1);
    return matches.length > 0 && matches[0].score > 0.4 ? matches[0] : null;
  }

  /**
   * Check if a match is ambiguous (multiple good matches).
   */
  isAmbiguous(matches: ProductMatch[]): boolean {
    if (matches.length < 2) return false;
    const topScore = matches[0].score;
    const secondScore = matches[1].score;
    // If the top two are very close, it's ambiguous
    return topScore - secondScore < 0.15 && secondScore > 0.5;
  }

  /**
   * Get available stock for a product.
   */
  async getAvailableStock(productId: string, businessId: string): Promise<number> {
    const inventory = await db.inventory.findUnique({
      where: { productId },
    });

    if (!inventory || inventory.businessId !== businessId) {
      return 0;
    }

    return inventory.stockOnHand - inventory.reservedStock;
  }

  /**
   * Get customer-specific price if available, otherwise product price.
   */
  async getCustomerPrice(
    productId: string,
    customerId: string | null,
    businessId: string
  ): Promise<number> {
    if (!customerId) {
      const product = await db.product.findUnique({
        where: { id: productId },
      });
      return product ? Number(product.price) : 0;
    }

    // Check for customer-specific pricing
    const customerPrice = await db.customerPrice.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    if (customerPrice) {
      return Number(customerPrice.price);
    }

    // Fall back to product price
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    return product ? Number(product.price) : 0;
  }

  // Private helper methods

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  private scoreProduct(
    query: string,
    product: { name: string; sku: string | null; aliases: string[] }
  ): { score: number; reason: string } {
    const normalizedName = this.normalize(product.name);
    const normalizedSku = product.sku ? this.normalize(product.sku) : "";

    // 1. Exact name match
    if (query === normalizedName) {
      return { score: 1.0, reason: "Exact name match" };
    }

    // 2. Name contains query or query contains name
    if (normalizedName.includes(query) || query.includes(normalizedName)) {
      const score = query.length / normalizedName.length;
      return { score: Math.max(score, 0.8), reason: "Partial name match" };
    }

    // 3. SKU match
    if (normalizedSku && query === normalizedSku) {
      return { score: 0.95, reason: "Exact SKU match" };
    }

    if (normalizedSku && normalizedSku.includes(query)) {
      return { score: 0.85, reason: "Partial SKU match" };
    }

    // 4. Alias match
    for (const alias of product.aliases) {
      const normalizedAlias = this.normalize(alias);
      if (query === normalizedAlias) {
        return { score: 0.9, reason: `Alias match: "${alias}"` };
      }
      if (normalizedAlias.includes(query) || query.includes(normalizedAlias)) {
        return { score: 0.75, reason: `Partial alias match: "${alias}"` };
      }
    }

    // 5. Word overlap scoring
    const queryWords = query.split(" ");
    const nameWords = normalizedName.split(" ");
    const aliasWords = product.aliases.flatMap(a => this.normalize(a).split(" "));
    const allWords = [...nameWords, ...aliasWords];

    let matchingWords = 0;
    for (const qWord of queryWords) {
      for (const pWord of allWords) {
        if (pWord.includes(qWord) || qWord.includes(pWord)) {
          matchingWords++;
          break;
        }
      }
    }

    if (matchingWords > 0) {
      const wordScore = matchingWords / queryWords.length;
      return { score: wordScore * 0.7, reason: "Word overlap match" };
    }

    // 6. Levenshtein-like similarity for typos
    const similarity = this.calculateSimilarity(query, normalizedName);
    if (similarity > 0.6) {
      return { score: similarity * 0.6, reason: "Fuzzy match (possible typo)" };
    }

    return { score: 0, reason: "No match" };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Simple character overlap
    const chars1 = new Set(str1.split(""));
    const chars2 = new Set(str2.split(""));
    const intersection = new Set([...chars1].filter(c => chars2.has(c)));
    
    return intersection.size / new Set([...chars1, ...chars2]).size;
  }
}

export const productMatcher = new ProductMatcher();
