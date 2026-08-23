"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { useInventory } from "@/hooks/use-api";
import { Search, AlertTriangle, Package } from "lucide-react";

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Inventory",
      description: "Track and manage your stock levels",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventory({ page, limit: 20 });
  const inventory = data?.data || [];
  const pagination = data?.pagination;

  // Filter by search on client side (product name/sku)
  const filteredInventory = inventory.filter((item: any) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      item.product?.name?.toLowerCase().includes(query) ||
      item.product?.sku?.toLowerCase().includes(query)
    );
  });

  const lowStockCount = filteredInventory.filter(
    (item: any) => (item.stockOnHand - item.reservedStock) <= item.lowStockThreshold
  ).length;

  const totalStockValue = filteredInventory.reduce(
    (sum: number, item: any) => sum + (item.stockOnHand * Number(item.product?.price || 0)),
    0
  );

  return (
    <DashboardLayout
      title="Inventory"
      description="Track and manage your stock levels"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            Adjust Stock
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{totalStockValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
              {lowStockCount > 0 && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No inventory items found</p>
              <p className="text-sm">
                {search ? "Try a different search term" : "Add products to see inventory"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock On Hand</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item: any) => {
                  const available = item.stockOnHand - item.reservedStock;
                  const isLow = available <= item.lowStockThreshold;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product?.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.product?.sku || "—"}
                      </TableCell>
                      <TableCell>
                        {item.stockOnHand} {item.unit}
                      </TableCell>
                      <TableCell>
                        {item.reservedStock} {item.unit}
                      </TableCell>
                      <TableCell>
                        {available} {item.unit}
                      </TableCell>
                      <TableCell>
                        {item.lowStockThreshold} {item.unit}
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          •••
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
