"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { useOrders } from "@/hooks/use-api";
import { Search, Filter, Plus } from "lucide-react";
import Link from "next/link";

const statusFilters = [
  { label: "All", value: undefined },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_CONFIRMATION" },
  { label: "Paid", value: "PAID" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrders({ page, limit: 20, status, search: search || undefined });
  const orders = data?.data || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout
      title="Orders"
      description="Manage all customer orders"
      actions={
        <Link href="/dashboard/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </Link>
      }
    >
      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {statusFilters.map((filter) => (
          <Button
            key={filter.label}
            variant={status === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No orders found</p>
              <p className="text-sm">
                {search ? "Try a different search term" : "Create your first order to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer?.name || "—"}</TableCell>
                    <TableCell>{order.items?.length || 0} items</TableCell>
                    <TableCell>{formatCurrency(Number(order.totalAmount))}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
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
            {pagination.total} orders
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
