"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { formatCurrency } from "@/lib/utils";
import { useProducts } from "@/hooks/use-api";
import { Search, Plus, Upload, Grid, List } from "lucide-react";

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Products",
      description: "Manage your product catalog",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProducts({ page, limit: 20, search: search || undefined });
  const products = data?.data || [];

  return (
    <DashboardLayout
      title="Products"
      description="Manage your product catalog"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      }
    >
      {/* Search and View Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-12 w-12 skeleton rounded-lg" />
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                  <div className="h-6 skeleton rounded w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">
            {search ? "Try a different search term" : "Add your first product to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏷️</span>
                  </div>
                  <Badge variant={product.isActive ? "success" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  SKU: {product.sku || "—"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    {formatCurrency(Number(product.price))}
                  </span>
                  <span
                    className={`text-sm ${
                      product.inventory?.stockOnHand <= 10
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {product.inventory?.stockOnHand || 0} in stock
                  </span>
                </div>
                {product.category && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline">{product.category.name}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product: any) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-lg">🏷️</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku || "—"} • {product.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold">{formatCurrency(Number(product.price))}</span>
                    <span className={`text-sm ${product.inventory?.stockOnHand <= 10 ? "text-red-600" : "text-muted-foreground"}`}>
                      {product.inventory?.stockOnHand || 0} in stock
                    </span>
                    <Badge variant={product.isActive ? "success" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="icon">•••</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
