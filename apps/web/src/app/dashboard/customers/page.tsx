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
import { formatCurrency } from "@/lib/utils";
import { useCustomers } from "@/hooks/use-api";
import { Search, Plus, Filter } from "lucide-react";

const segmentColors: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-800",
  HIGH_VALUE: "bg-blue-100 text-blue-800",
  NEW: "bg-green-100 text-green-800",
  ACTIVE: "bg-gray-100 text-gray-800",
  INACTIVE: "bg-red-100 text-red-800",
  OVERDUE: "bg-orange-100 text-orange-800",
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Customers",
      description: "Manage your customer relationships",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [segment, setSegment] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCustomers({ page, limit: 20, search: search || undefined, segment });
  const customers = data?.data || [];
  const pagination = data?.pagination;

  // Calculate summary stats from all customers (first page for now)
  const totalCustomers = pagination?.total || 0;
  const vipCount = customers.filter((c: any) => c.segment === "VIP").length;
  const avgOrderValue =
    customers.length > 0
      ? customers.reduce((sum: number, c: any) => sum + Number(c.totalSpend || 0), 0) /
        Math.max(customers.reduce((sum: number, c: any) => sum + (c.orderCount || 0), 0), 1)
      : 0;

  return (
    <DashboardLayout
      title="Customers"
      description="Manage your customer relationships"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repeat Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.length > 0
                ? `${Math.round(
                    (customers.filter((c: any) => (c.orderCount || 0) > 1).length /
                      customers.length) *
                      100
                  )}%`
                : "0%"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={() => setSegment(segment ? undefined : "VIP")}>
          <Filter className="h-4 w-4 mr-2" />
          {segment ? `Filtering: ${segment}` : "Filter"}
        </Button>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No customers found</p>
              <p className="text-sm">
                {search
                  ? "Try a different search term"
                  : "Customers will appear here after their first order"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {customer.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>{customer.orderCount || 0}</TableCell>
                    <TableCell>{formatCurrency(Number(customer.totalSpend || 0))}</TableCell>
                    <TableCell>
                      <Badge className={segmentColors[customer.segment] || ""}>
                        {customer.segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.lastOrderAt
                        ? new Date(customer.lastOrderAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        •••
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{" "}
            {pagination.total} customers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
