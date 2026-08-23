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
import { useOrders } from "@/hooks/use-api";
import { Search, Filter, Truck, MapPin, Clock, CheckCircle } from "lucide-react";

const statusFilters = [
  { label: "All", value: undefined },
  { label: "Pending", value: "PENDING" },
  { label: "In Transit", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered", value: "COMPLETED" },
];

const statusColors: Record<string, string> = {
  PENDING: "warning",
  OUT_FOR_DELIVERY: "default",
  COMPLETED: "success",
  PROCESSING: "secondary",
};

export default function DeliveriesPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Deliveries",
      description: "Track and manage order deliveries",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [page, setPage] = useState(1);

  // Use orders with delivery-related statuses
  const { data, isLoading } = useOrders({
    page,
    limit: 20,
    status: status || undefined,
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  // Filter to only show orders that need delivery tracking
  const deliveryOrders = orders.filter((order: any) =>
    ["PENDING", "PROCESSING", "READY_FOR_FULFILLMENT", "OUT_FOR_DELIVERY", "COMPLETED"].includes(order.status)
  );

  // Calculate stats
  const pendingCount = deliveryOrders.filter((o: any) =>
    ["PENDING", "PROCESSING", "READY_FOR_FULFILLMENT"].includes(o.status)
  ).length;
  const inTransitCount = deliveryOrders.filter((o: any) => o.status === "OUT_FOR_DELIVERY").length;
  const deliveredCount = deliveryOrders.filter((o: any) => o.status === "COMPLETED").length;

  return (
    <DashboardLayout
      title="Deliveries"
      description="Track and manage order deliveries"
      actions={
        <Button>
          <Truck className="h-4 w-4 mr-2" />
          Assign Driver
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 mb-6">
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
          <Input placeholder="Search deliveries..." className="pl-9" />
        </div>
      </div>

      {/* Deliveries Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : deliveryOrders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No deliveries found</p>
              <p className="text-sm">
                Orders will appear here when they're ready for delivery
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <a href={`/dashboard/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </a>
                    </TableCell>
                    <TableCell>{order.customer?.name || "—"}</TableCell>
                    <TableCell>₦{Number(order.totalAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[order.status] as any || "secondary"}>
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
